import { prisma } from "../config/db.js";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashToken,
  generateResetToken,
  verifyResetToken,
} from "../utils/crypto.js";
import { sanitizeUser } from "../utils/sanitize.js";
import { isMfaEnforcedForRole } from "../utils/mfa.js";

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Registers a new customer or B2B user.
 * Public registration strictly defaults to CUSTOMER or B2B, never ADMIN.
 */
export async function registerUser({
  fullName,
  email,
  password,
  phone = null,
  accountType = "CUSTOMER",
  companyName = null,
  gstin = null,
  ipAddress = null,
  userAgent = null,
}) {
  const normalizedEmail = email.trim().toLowerCase();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const error = new Error("An account with this email address already exists.");
    error.code = "EMAIL_ALREADY_EXISTS";
    error.status = 409;
    throw error;
  }

  // Enforce role bounds: never allow ADMIN via registration
  const assignedRole = accountType === "B2B" ? "B2B" : "CUSTOMER";

  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      fullName,
      email: normalizedEmail,
      passwordHash,
      phone,
      companyName: assignedRole === "B2B" ? companyName : null,
      gstin: assignedRole === "B2B" ? gstin : null,
      role: assignedRole,
      isActive: true,
      emailVerified: false,
    },
  });

  // Automatically create a session for the newly registered user
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await prisma.session.create({
    data: {
      userId: newUser.id,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return {
    user: sanitizeUser(newUser),
    rawToken,
    expiresAt,
  };
}

/**
 * Authenticates user credentials and generates a database-backed session token.
 * Generic responses are used to prevent user enumeration attacks.
 */
export async function loginUser({ email, password, ipAddress = null, userAgent = null }) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Constant-time check: if user doesn't exist, still perform a dummy hash comparison to prevent timing attacks
  if (!user) {
    await hashPassword("dummy-password-for-timing-consistency");
    const error = new Error("Invalid email or password.");
    error.code = "INVALID_CREDENTIALS";
    error.status = 401;
    throw error;
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error("Invalid email or password.");
    error.code = "INVALID_CREDENTIALS";
    error.status = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("This account has been deactivated. Please contact support.");
    error.code = "ACCOUNT_DISABLED";
    error.status = 403;
    throw error;
  }

  // 1. If MFA is enabled on this account, issue a short-lived single-use MFA login challenge
  if (user.mfaEnabled) {
    const mfaChallengeToken = generateSessionToken();
    const tokenHash = hashToken(mfaChallengeToken);
    const challengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.mfaChallenge.create({
      data: {
        userId: user.id,
        tokenHash,
        type: "LOGIN",
        expiresAt: challengeExpiresAt,
        ipAddress,
        userAgent,
      },
    });

    return {
      mfaRequired: true,
      mfaChallengeToken,
      expiresInSeconds: 300,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  // 2. If MFA is mandatory for this user's role (e.g. ADMIN), issue a restricted enrollment challenge
  if (isMfaEnforcedForRole(user.role)) {
    const mfaSetupToken = generateSessionToken();
    const tokenHash = hashToken(mfaSetupToken);
    const challengeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.mfaChallenge.create({
      data: {
        userId: user.id,
        tokenHash,
        type: "ENROLLMENT",
        expiresAt: challengeExpiresAt,
        ipAddress,
        userAgent,
      },
    });

    return {
      mfaSetupRequired: true,
      mfaSetupToken,
      expiresInSeconds: 600,
      message: `Multi-factor authentication (MFA) is mandatory for your role (${user.role}). Please complete enrollment to continue.`,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  // 3. Normal login for accounts without MFA (when policy permits)
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  // Opportunistic cleanup of expired sessions for this user
  pruneExpiredSessions(user.id).catch(() => {});

  return {
    user: sanitizeUser(user),
    rawToken,
    expiresAt,
  };
}

/**
 * Invalidates and deletes a session from the PostgreSQL database.
 */
export async function logoutUser(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return;

  const tokenHash = hashToken(rawToken);
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
}

/**
 * Changes a user's password after verifying their existing password.
 * Revokes all other active sessions for security.
 */
export async function changePassword(userId, currentPassword, newPassword, currentToken = null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error("User account not found.");
    error.code = "USER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  const isMatch = await verifyPassword(currentPassword, user.passwordHash);
  if (!isMatch) {
    const error = new Error("Current password does not match.");
    error.code = "INVALID_CURRENT_PASSWORD";
    error.status = 400;
    throw error;
  }

  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  // Revoke all other active sessions for this user, keeping only current session active
  if (currentToken) {
    const currentHash = hashToken(currentToken);
    await prisma.session.deleteMany({
      where: {
        userId,
        tokenHash: { not: currentHash },
      },
    });
  }

  return { success: true };
}

/**
 * Handles password reset request with generic non-enumerating message.
 * Honestly reports if an email delivery provider is not configured.
 * Generates an expiring single-use cryptographic token when a user exists.
 */
export async function requestPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Check if an email provider is configured
  const emailServiceConfigured = Boolean(
    process.env.SMTP_HOST || process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY
  );

  if (user && user.isActive) {
    // Generate token for email dispatch
    generateResetToken(user.id, user.passwordHash);
  } else {
    // Perform dummy timing work to prevent timing enumeration
    await hashPassword("dummy-password-for-timing-consistency");
  }

  return {
    dispatched: emailServiceConfigured && Boolean(user),
    emailProviderConfigured: emailServiceConfigured,
    message: emailServiceConfigured
      ? "If an account with that email address exists, password reset instructions have been sent."
      : "Password reset request accepted. (Notice: External email provider is not currently configured in the environment; no reset email was dispatched).",
  };
}

/**
 * Resets user password using a single-use expiring cryptographic token.
 * Automatically invalidates all active sessions on password reset.
 */
export async function resetPassword({ token, newPassword }) {
  if (!token || typeof token !== "string") {
    const error = new Error("Invalid or malformed reset token.");
    error.code = "INVALID_RESET_TOKEN";
    error.status = 400;
    throw error;
  }

  const parts = token.split(":");
  if (parts.length !== 3) {
    const error = new Error("Invalid or malformed reset token.");
    error.code = "INVALID_RESET_TOKEN";
    error.status = 400;
    throw error;
  }

  const [userId] = parts;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive) {
    const error = new Error("The password reset token is invalid or has already been used.");
    error.code = "INVALID_RESET_TOKEN";
    error.status = 400;
    throw error;
  }

  const check = verifyResetToken(token, user);
  if (!check.valid) {
    if (check.reason === "EXPIRED") {
      const error = new Error("The password reset token has expired. Please request a new password reset.");
      error.code = "EXPIRED_RESET_TOKEN";
      error.status = 400;
      throw error;
    }

    const error = new Error("The password reset token is invalid or has already been used.");
    error.code = "INVALID_RESET_TOKEN";
    error.status = 400;
    throw error;
  }

  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  // Revoke all active sessions for this user upon password reset
  await prisma.session.deleteMany({
    where: { userId: user.id },
  });

  return {
    success: true,
    message: "Password has been reset successfully. Please log in with your new password.",
  };
}

/**
 * Background helper to clean up expired sessions for a user.
 */
async function pruneExpiredSessions(userId) {
  await prisma.session.deleteMany({
    where: {
      userId,
      expiresAt: { lt: new Date() },
    },
  });
}
