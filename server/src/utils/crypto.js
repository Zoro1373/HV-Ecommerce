import crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcryptjs with work factor 12.
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a cryptographically secure, 32-byte hexadecimal session token.
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes the SHA-256 hash of a token for safe database storage.
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates an expiring, single-use, HMAC-signed password reset token.
 * Incorporates the user's current password hash so the token is automatically invalidated upon use.
 */
export function generateResetToken(
  userId,
  passwordHash,
  secret = process.env.SESSION_SECRET || "vertex-secure-token-signing-secret",
  expiresInMs = 60 * 60 * 1000 // 1 hour
) {
  const expiresAt = Date.now() + expiresInMs;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${userId}:${expiresAt}:${passwordHash}`)
    .digest("hex");

  return `${userId}:${expiresAt}:${signature}`;
}

/**
 * Verifies a password reset token against user record and secret.
 */
export function verifyResetToken(
  token,
  user,
  secret = process.env.SESSION_SECRET || "vertex-secure-token-signing-secret"
) {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "MALFORMED" };
  }

  const parts = token.split(":");
  if (parts.length !== 3) {
    return { valid: false, reason: "MALFORMED" };
  }

  const [tokenId, expiryStr, signature] = parts;

  if (tokenId !== user.id) {
    return { valid: false, reason: "USER_MISMATCH" };
  }

  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || Date.now() > expiry) {
    return { valid: false, reason: "EXPIRED" };
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${user.id}:${expiryStr}:${user.passwordHash}`)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  return { valid: true };
}
