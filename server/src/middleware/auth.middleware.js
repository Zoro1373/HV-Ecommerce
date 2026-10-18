import { prisma } from "../config/db.js";
import { hashToken } from "../utils/crypto.js";
import { sanitizeUser } from "../utils/sanitize.js";

export const SESSION_COOKIE_NAME = "vertex_session";

/**
 * Helper to extract canonical origin (protocol://host[:port]) from a URL or origin string.
 * Returns null if the URL is invalid or malformed.
 */
export function getCanonicalOrigin(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return null;
  try {
    const parsed = new URL(urlStr);
    return parsed.origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Returns the set of canonical trusted origins for the environment.
 * In production: strictly allows configured FRONTEND_URL and ADDITIONAL_ALLOWED_ORIGINS.
 * In development/test: also allows standard localhost development origins.
 */
export function getTrustedOrigins() {
  const isProduction = process.env.NODE_ENV === "production";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const trusted = new Set();

  const canonicalFrontend = getCanonicalOrigin(frontendUrl);
  if (canonicalFrontend) {
    trusted.add(canonicalFrontend);
  }

  // Support additional origins if configured (comma-separated list)
  if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
    process.env.ADDITIONAL_ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((url) => {
        const canonical = getCanonicalOrigin(url);
        if (canonical) trusted.add(canonical);
      });
  }

  // Localhost origins are only automatically trusted in non-production environments
  if (!isProduction) {
    trusted.add("http://localhost:3000");
    trusted.add("http://127.0.0.1:3000");
  }

  return trusted;
}

/**
 * Validates CSRF protection on state-changing cookie-authenticated requests.
 * Defense-in-depth:
 * 1. Safe HTTP methods (GET, HEAD, OPTIONS) are exempt.
 * 2. If Origin or Referer is present, it must EXACTLY match a trusted canonical origin.
 *    Untrusted origins (including lookalikes or untrusted cross-origin requests) are strictly
 *    rejected with 403 CSRF_ERROR. Custom headers alone DO NOT bypass an untrusted origin check.
 * 3. If neither Origin nor Referer is provided (e.g. non-browser API clients or privacy proxies),
 *    a custom request header (x-requested-with or x-csrf-token) is strictly required to prevent
 *    cross-site HTML form submissions.
 */
export function verifyCsrf(req) {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  const rawOrigin = req.headers.origin || req.headers.referer;
  const hasCustomHeader = Boolean(
    req.headers["x-requested-with"] || req.headers["x-csrf-token"]
  );

  const trustedOrigins = getTrustedOrigins();

  if (rawOrigin) {
    const requestOrigin = getCanonicalOrigin(rawOrigin);
    if (!requestOrigin || !trustedOrigins.has(requestOrigin)) {
      // Explicit untrusted or unparseable origin: NEVER allow, regardless of custom headers!
      return false;
    }
    // Origin is trusted!
    return true;
  }

  // Neither Origin nor Referer is present:
  // Must have a custom header to ensure request is from an API client/AJAX and not a standard browser form submit
  return hasCustomHeader;
}

/**
 * Reusable CSRF protection middleware for state-changing routes.
 */
export function csrfProtection(req, res, next) {
  if (verifyCsrf(req)) {
    return next();
  }

  return res.status(403).json({
    error: {
      code: "CSRF_ERROR",
      message: "Invalid or untrusted origin, or missing CSRF header for state-changing request.",
    },
  });
}

/**
 * Authentication middleware that verifies the HttpOnly session cookie,
 * checks SHA-256 token hash against PostgreSQL, and enforces session expiration.
 */
export async function authenticateSession(req, res, next) {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];

  if (!rawToken || typeof rawToken !== "string") {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required. Please log in.",
      },
    });
  }

  // Enforce CSRF protection on state-changing requests
  if (!verifyCsrf(req)) {
    return res.status(403).json({
      error: {
        code: "CSRF_ERROR",
        message: "Invalid or missing CSRF header for state-changing request.",
      },
    });
  }

  try {
    const tokenHash = hashToken(rawToken);

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return res.status(401).json({
        error: {
          code: "SESSION_EXPIRED",
          message: "Session not found or has been revoked.",
        },
      });
    }

    if (new Date() > new Date(session.expiresAt)) {
      // Purge expired session from database
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return res.status(401).json({
        error: {
          code: "SESSION_EXPIRED",
          message: "Your session has expired. Please log in again.",
        },
      });
    }

    if (!session.user.isActive) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return res.status(403).json({
        error: {
          code: "ACCOUNT_DISABLED",
          message: "This account has been deactivated. Please contact support.",
        },
      });
    }

    // Attach sanitized user and session metadata to request
    req.user = sanitizeUser(session.user);
    req.session = {
      id: session.id,
      expiresAt: session.expiresAt,
      rawToken,
    };

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while verifying your session.",
      },
    });
  }
}

/**
 * Optional authentication middleware for endpoints accessible to both guests and logged-in users.
 */
export async function optionalAuth(req, res, next) {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];

  if (!rawToken || typeof rawToken !== "string") {
    req.user = null;
    req.session = null;
    return next();
  }

  try {
    const tokenHash = hashToken(rawToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (session && new Date() <= new Date(session.expiresAt) && session.user.isActive) {
      req.user = sanitizeUser(session.user);
      req.session = {
        id: session.id,
        expiresAt: session.expiresAt,
        rawToken,
      };
    } else {
      req.user = null;
      req.session = null;
    }
  } catch {
    req.user = null;
    req.session = null;
  }

  next();
}
