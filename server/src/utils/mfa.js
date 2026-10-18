import crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import qrcode from "qrcode";

const TOTP_ISSUER = "VERTEX";
const TOTP_WINDOW = 1;
const TOTP_EPOCH_TOLERANCE = 30; // ±30s clock drift window (standard RFC 6238)

/**
 * Derives a strictly 32-byte key for AES-256-GCM encryption.
 */
export function getMfaEncryptionKey() {
  const rawKey =
    process.env.MFA_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET ||
    "vertex-default-mfa-encryption-key-for-dev";

  // Derive exact 256-bit key via SHA-256
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypts a TOTP secret at rest using authenticated AES-256-GCM.
 * Format: iv:authTag:ciphertext (hex encoded)
 */
export function encryptSecret(plaintext) {
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Plaintext TOTP secret is required for encryption.");
  }

  const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
  const key = getMfaEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a TOTP secret from authenticated AES-256-GCM storage.
 */
export function decryptSecret(encryptedPayload) {
  if (!encryptedPayload || typeof encryptedPayload !== "string") {
    throw new Error("Encrypted TOTP secret payload is required for decryption.");
  }

  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted TOTP payload format.");
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(cipherHex, "hex");

  const key = getMfaEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Generates a cryptographically random RFC 6238 Base32 TOTP secret.
 */
export function generateTotpSecret() {
  return generateSecret();
}

/**
 * Builds an otpauth:// provisioning URI compatible with Microsoft Authenticator and Google Authenticator.
 */
export function generateTotpUri({ secret, email, issuer = TOTP_ISSUER }) {
  return generateURI({
    secret,
    label: email,
    issuer,
  });
}

/**
 * Generates a PNG data URL QR code representation of the provisioning URI.
 */
export async function generateQrCodeDataUrl(otpauthUri) {
  return qrcode.toDataURL(otpauthUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 250,
  });
}

/**
 * Verifies a 6-digit TOTP code against a decrypted secret,
 * enforcing a narrow clock-drift window (±30s) and time-step replay prevention.
 */
export function verifyTotpCode({ token, secret, lastVerifiedStep = null }) {
  if (!token || !secret) {
    return { valid: false, reason: "MISSING_PARAMS" };
  }

  const cleanedToken = String(token).trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanedToken)) {
    return { valid: false, reason: "INVALID_FORMAT" };
  }

  const result = verifySync({
    token: cleanedToken,
    secret,
    epochTolerance: TOTP_EPOCH_TOLERANCE,
    window: TOTP_WINDOW,
  });

  if (!result || !result.valid) {
    return { valid: false, reason: "INVALID_CODE" };
  }

  // Replay prevention: check if this exact time step has already been accepted
  const currentStepStr = String(result.timeStep);
  if (lastVerifiedStep && String(lastVerifiedStep) === currentStepStr) {
    return { valid: false, reason: "REPLAYED_CODE" };
  }

  return {
    valid: true,
    timeStep: currentStepStr,
  };
}

/**
 * Normalizes a recovery code by stripping hyphens and whitespace and converting to uppercase.
 */
export function normalizeRecoveryCode(code) {
  if (!code || typeof code !== "string") return "";
  return code.trim().replace(/[-\s]/g, "").toUpperCase();
}

/**
 * Computes the SHA-256 hash of a normalized recovery code for secure database storage.
 */
export function hashRecoveryCode(code) {
  const normalized = normalizeRecoveryCode(code);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Generates a set of high-entropy single-use recovery codes.
 * Returns formatted plaintext codes (e.g. XXXX-XXXX-XXXX) and their cryptographic hashes.
 */
export function generateRecoveryCodes(count = 10) {
  const plainCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < count; i++) {
    // 12 hexadecimal characters formatted as 3 blocks of 4
    const hex = crypto.randomBytes(6).toString("hex").toUpperCase();
    const formatted = `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
    plainCodes.push(formatted);
    hashedCodes.push(hashRecoveryCode(formatted));
  }

  return {
    plainCodes,
    hashedCodes,
  };
}

/**
 * Checks whether MFA enforcement policy applies to a given user role.
 * Configured via MFA_ENFORCED_ROLES (comma-separated list, e.g., "ADMIN" or "ADMIN,B2B").
 */
export function isMfaEnforcedForRole(role) {
  if (!role || !process.env.MFA_ENFORCED_ROLES) {
    return false;
  }

  const enforcedRoles = process.env.MFA_ENFORCED_ROLES.split(",")
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);

  return enforcedRoles.includes(role.toUpperCase());
}
