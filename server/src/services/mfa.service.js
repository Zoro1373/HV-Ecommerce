import { prisma } from "../config/db.js";
import {
  generateTotpSecret,
  generateTotpUri,
  generateQrCodeDataUrl,
  encryptSecret,
  decryptSecret,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "../utils/mfa.js";
import {
  verifyPassword,
  generateSessionToken,
  hashToken,
} from "../utils/crypto.js";
import { sanitizeUser } from "../utils/sanitize.js";

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Initiates MFA enrollment for an authenticated user.
 * Generates an RFC 6238 TOTP secret, saves it encrypted as mfaPendingSecret,
 * and returns the secret, otpauth URI, and QR-code data URL.
 */
export async function startMfaEnrollment(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive) {
    const error = new Error("User account not found or deactivated.");
    error.code = "USER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (user.mfaEnabled) {
    const error = new Error("MFA is already enabled on this account.");
    error.code = "MFA_ALREADY_ENABLED";
    error.status = 400;
    throw error;
  }

  const secret = generateTotpSecret();
  const encryptedPendingSecret = encryptSecret(secret);

  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaPendingSecret: encryptedPendingSecret,
    },
  });

  const otpauthUri = generateTotpUri({
    secret,
    email: user.email,
    issuer: "VERTEX",
  });

  const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUri);

  return {
    secret,
    otpauthUri,
    qrCodeDataUrl,
    issuer: "VERTEX",
    account: user.email,
  };
}

/**
 * Confirms MFA enrollment by verifying the initial TOTP code.
 * Upon successful verification, promotes pending secret to active,
 * generates 10 single-use recovery codes, and stores only their hashes.
 */
export async function confirmMfaEnrollment(userId, totpCode) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive) {
    const error = new Error("User account not found or deactivated.");
    error.code = "USER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (!user.mfaPendingSecret) {
    const error = new Error("No pending MFA enrollment found. Please start enrollment first.");
    error.code = "NO_PENDING_ENROLLMENT";
    error.status = 400;
    throw error;
  }

  const decryptedSecret = decryptSecret(user.mfaPendingSecret);
  const verifyResult = verifyTotpCode({
    token: totpCode,
    secret: decryptedSecret,
    lastVerifiedStep: user.mfaLastVerifiedStep,
  });

  if (!verifyResult.valid) {
    const error = new Error("Invalid TOTP verification code. Please check your authenticator app and try again.");
    error.code = "INVALID_TOTP_CODE";
    error.status = 400;
    throw error;
  }

  // Generate 10 single-use recovery codes
  const { plainCodes, hashedCodes } = generateRecoveryCodes(10);

  // Atomically update user, insert recovery codes, and log audit event
  await prisma.$transaction(async (tx) => {
    // Atomically claim the pending enrollment conditionally using affected row count
    const claimResult = await tx.user.updateMany({
      where: {
        id: userId,
        mfaPendingSecret: user.mfaPendingSecret,
        mfaEnabled: false,
      },
      data: {
        mfaEnabled: true,
        mfaSecret: user.mfaPendingSecret,
        mfaPendingSecret: null,
        mfaEnrolledAt: new Date(),
        mfaLastVerifiedStep: null,
      },
    });

    if (claimResult.count !== 1) {
      const error = new Error("This MFA enrollment has already been confirmed or is no longer pending.");
      error.code = "CONCURRENT_ENROLLMENT_CONFLICT";
      error.status = 400;
      throw error;
    }

    // Invalidate any pre-existing recovery codes
    await tx.recoveryCode.deleteMany({
      where: { userId },
    });

    // Insert new hashed recovery codes
    await tx.recoveryCode.createMany({
      data: hashedCodes.map((codeHash) => ({
        userId,
        codeHash,
      })),
    });

    // Record audit event
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "MFA_ENABLED",
        entityType: "User",
        entityId: userId,
      },
    });
  }, { maxWait: 10000, timeout: 20000 });

  return {
    success: true,
    message: "Multi-factor authentication enabled successfully.",
    recoveryCodes: plainCodes,
  };
}

/**
 * Verifies a second-factor challenge during login using either a 6-digit TOTP code
 * or a single-use recovery code.
 */
export async function verifyMfaLogin({
  mfaChallengeToken,
  code,
  ipAddress = null,
  userAgent = null,
}) {
  if (!mfaChallengeToken || !code) {
    const error = new Error("MFA challenge token and verification code are required.");
    error.code = "VALIDATION_ERROR";
    error.status = 400;
    throw error;
  }

  const tokenHash = hashToken(mfaChallengeToken);

  const challenge = await prisma.mfaChallenge.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!challenge || challenge.type !== "LOGIN") {
    const error = new Error("Invalid or expired MFA challenge.");
    error.code = "INVALID_CHALLENGE";
    error.status = 400;
    throw error;
  }

  if (challenge.usedAt) {
    const error = new Error("This MFA challenge has already been used. Please log in again.");
    error.code = "CHALLENGE_ALREADY_USED";
    error.status = 400;
    throw error;
  }

  if (new Date() > new Date(challenge.expiresAt)) {
    const error = new Error("MFA challenge has expired. Please log in again.");
    error.code = "CHALLENGE_EXPIRED";
    error.status = 400;
    throw error;
  }

  const { user } = challenge;
  if (!user.isActive) {
    const error = new Error("This account has been deactivated. Please contact support.");
    error.code = "ACCOUNT_DISABLED";
    error.status = 403;
    throw error;
  }

  if (!user.mfaEnabled || !user.mfaSecret) {
    const error = new Error("MFA is not enabled on this account.");
    error.code = "MFA_NOT_ENABLED";
    error.status = 400;
    throw error;
  }

  const trimmedCode = code.trim();
  let verified = false;
  let usedRecoveryCodeId = null;
  let newTimeStep = null;

  // 1. Try TOTP code if it matches 6-digit numeric pattern
  if (/^\d{6}$/.test(trimmedCode)) {
    const decryptedSecret = decryptSecret(user.mfaSecret);
    const totpCheck = verifyTotpCode({
      token: trimmedCode,
      secret: decryptedSecret,
      lastVerifiedStep: user.mfaLastVerifiedStep,
    });

    if (totpCheck.valid) {
      verified = true;
      newTimeStep = totpCheck.timeStep;
    } else if (totpCheck.reason === "REPLAYED_CODE") {
      const error = new Error("This TOTP code has already been used. Please wait for the next code.");
      error.code = "CODE_ALREADY_USED";
      error.status = 400;
      throw error;
    }
  }

  // 2. If not verified via TOTP, check against active recovery codes
  if (!verified) {
    const codeHash = hashRecoveryCode(trimmedCode);
    const matchingRecoveryCode = await prisma.recoveryCode.findFirst({
      where: {
        userId: user.id,
        codeHash,
        usedAt: null,
      },
    });

    if (matchingRecoveryCode) {
      verified = true;
      usedRecoveryCodeId = matchingRecoveryCode.id;
    }
  }

  if (!verified) {
    const error = new Error("Invalid authenticator code or recovery code.");
    error.code = "INVALID_MFA_CODE";
    error.status = 401;
    throw error;
  }

  // Atomically consume challenge, mark recovery code used (if applicable), update replay step, and issue session
  const rawSessionToken = generateSessionToken();
  const sessionTokenHash = hashToken(rawSessionToken);
  const sessionExpiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await prisma.$transaction(async (tx) => {
    // 1. Atomically claim the challenge with conditional update checking affected-row count
    const claimResult = await tx.mfaChallenge.updateMany({
      where: {
        id: challenge.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (claimResult.count !== 1) {
      const error = new Error("This MFA challenge has already been used. Please log in again.");
      error.code = "CHALLENGE_ALREADY_USED";
      error.status = 400;
      throw error;
    }

    // 2. If recovery code was used, atomically claim it conditionally
    if (usedRecoveryCodeId) {
      const recClaimResult = await tx.recoveryCode.updateMany({
        where: {
          id: usedRecoveryCodeId,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      if (recClaimResult.count !== 1) {
        const error = new Error("This recovery code has already been used. Please log in again.");
        error.code = "RECOVERY_CODE_ALREADY_USED";
        error.status = 400;
        throw error;
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "RECOVERY_CODE_USED",
          entityType: "User",
          entityId: user.id,
        },
      });
    }

    // 3. If TOTP code was used, update replay tracking step
    if (newTimeStep) {
      await tx.user.update({
        where: { id: user.id },
        data: { mfaLastVerifiedStep: newTimeStep },
      });
    }

    // 4. Create regular authenticated session
    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: sessionTokenHash,
        expiresAt: sessionExpiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Audit log successful MFA login
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "MFA_LOGIN_SUCCESS",
        entityType: "User",
        entityId: user.id,
        metadata: {
          usedRecoveryCode: Boolean(usedRecoveryCodeId),
        },
      },
    });
  }, { maxWait: 10000, timeout: 20000 });

  return {
    user: sanitizeUser(user),
    rawToken: rawSessionToken,
    expiresAt: sessionExpiresAt,
    usedRecoveryCode: Boolean(usedRecoveryCodeId),
  };
}

/**
 * Disables MFA for an authenticated user.
 * Requires recent password verification and a valid current TOTP code or recovery code.
 * Revokes all other active sessions for security.
 */
export async function disableMfa({
  userId,
  currentPassword,
  code,
  currentToken = null,
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive) {
    const error = new Error("User account not found.");
    error.code = "USER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (!user.mfaEnabled || !user.mfaSecret) {
    const error = new Error("MFA is not currently enabled on this account.");
    error.code = "MFA_NOT_ENABLED";
    error.status = 400;
    throw error;
  }

  const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error("Current password does not match.");
    error.code = "INVALID_CURRENT_PASSWORD";
    error.status = 400;
    throw error;
  }

  const trimmedCode = code.trim();
  let codeVerified = false;

  // Check TOTP code
  if (/^\d{6}$/.test(trimmedCode)) {
    const decryptedSecret = decryptSecret(user.mfaSecret);
    const check = verifyTotpCode({
      token: trimmedCode,
      secret: decryptedSecret,
      lastVerifiedStep: user.mfaLastVerifiedStep,
    });
    if (check.valid) {
      codeVerified = true;
    }
  }

  // Check recovery code
  if (!codeVerified) {
    const codeHash = hashRecoveryCode(trimmedCode);
    const matchedRecovery = await prisma.recoveryCode.findFirst({
      where: {
        userId,
        codeHash,
        usedAt: null,
      },
    });
    if (matchedRecovery) {
      codeVerified = true;
    }
  }

  if (!codeVerified) {
    const error = new Error("Invalid authenticator code or recovery code.");
    error.code = "INVALID_MFA_CODE";
    error.status = 400;
    throw error;
  }

  // Atomically disable MFA, remove recovery codes, and revoke other sessions
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaPendingSecret: null,
        mfaEnrolledAt: null,
        mfaLastVerifiedStep: null,
      },
    });

    await tx.recoveryCode.deleteMany({
      where: { userId },
    });

    await tx.mfaChallenge.deleteMany({
      where: { userId },
    });

    if (currentToken) {
      const currentHash = hashToken(currentToken);
      await tx.session.deleteMany({
        where: {
          userId,
          tokenHash: { not: currentHash },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "MFA_DISABLED",
        entityType: "User",
        entityId: userId,
      },
    });
  });

  return {
    success: true,
    message: "Multi-factor authentication disabled successfully. Other active sessions revoked.",
  };
}

/**
 * Regenerates recovery codes for an authenticated user with MFA enabled.
 * Requires recent password verification. Invalidates all previous recovery codes.
 */
export async function regenerateRecoveryCodes({ userId, currentPassword }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive) {
    const error = new Error("User account not found.");
    error.code = "USER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (!user.mfaEnabled) {
    const error = new Error("MFA must be enabled to regenerate recovery codes.");
    error.code = "MFA_NOT_ENABLED";
    error.status = 400;
    throw error;
  }

  const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error("Current password does not match.");
    error.code = "INVALID_CURRENT_PASSWORD";
    error.status = 400;
    throw error;
  }

  const { plainCodes, hashedCodes } = generateRecoveryCodes(10);

  await prisma.$transaction(async (tx) => {
    await tx.recoveryCode.deleteMany({
      where: { userId },
    });

    await tx.recoveryCode.createMany({
      data: hashedCodes.map((codeHash) => ({
        userId,
        codeHash,
      })),
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "RECOVERY_CODES_REGENERATED",
        entityType: "User",
        entityId: userId,
      },
    });
  });

  return {
    success: true,
    message: "Recovery codes have been regenerated successfully. Store them securely.",
    recoveryCodes: plainCodes,
  };
}

/**
 * Starts restricted enrollment for an account subject to mandatory MFA policy.
 * Validates the enrollment challenge token without issuing a session.
 */
export async function startSetupRequiredEnrollment(mfaSetupToken) {
  if (!mfaSetupToken) {
    const error = new Error("MFA setup token is required.");
    error.code = "VALIDATION_ERROR";
    error.status = 400;
    throw error;
  }

  const tokenHash = hashToken(mfaSetupToken);
  const challenge = await prisma.mfaChallenge.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!challenge || challenge.type !== "ENROLLMENT") {
    const error = new Error("Invalid or expired MFA setup token.");
    error.code = "INVALID_SETUP_TOKEN";
    error.status = 400;
    throw error;
  }

  if (challenge.usedAt || new Date() > new Date(challenge.expiresAt)) {
    const error = new Error("MFA setup token has expired or already been used. Please log in again.");
    error.code = "SETUP_TOKEN_EXPIRED";
    error.status = 400;
    throw error;
  }

  const { user } = challenge;
  const secret = generateTotpSecret();
  const encryptedPending = encryptSecret(secret);

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaPendingSecret: encryptedPending },
  });

  const otpauthUri = generateTotpUri({
    secret,
    email: user.email,
    issuer: "VERTEX",
  });

  const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUri);

  return {
    secret,
    otpauthUri,
    qrCodeDataUrl,
    issuer: "VERTEX",
    account: user.email,
  };
}

/**
 * Confirms mandatory MFA enrollment and issues the regular session cookie upon success.
 */
export async function confirmSetupRequiredEnrollment({
  mfaSetupToken,
  totpCode,
  ipAddress = null,
  userAgent = null,
}) {
  const tokenHash = hashToken(mfaSetupToken);
  const challenge = await prisma.mfaChallenge.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!challenge || challenge.type !== "ENROLLMENT") {
    const error = new Error("Invalid or expired MFA setup token.");
    error.code = "INVALID_SETUP_TOKEN";
    error.status = 400;
    throw error;
  }

  if (challenge.usedAt || new Date() > new Date(challenge.expiresAt)) {
    const error = new Error("MFA setup token has expired or already been used. Please log in again.");
    error.code = "SETUP_TOKEN_EXPIRED";
    error.status = 400;
    throw error;
  }

  const { user } = challenge;
  if (!user.mfaPendingSecret) {
    const error = new Error("No pending MFA enrollment secret found. Please restart setup.");
    error.code = "NO_PENDING_ENROLLMENT";
    error.status = 400;
    throw error;
  }

  const decryptedSecret = decryptSecret(user.mfaPendingSecret);
  const verifyResult = verifyTotpCode({
    token: totpCode,
    secret: decryptedSecret,
  });

  if (!verifyResult.valid) {
    const error = new Error("Invalid TOTP verification code. Please check your authenticator app and try again.");
    error.code = "INVALID_TOTP_CODE";
    error.status = 400;
    throw error;
  }

  const { plainCodes, hashedCodes } = generateRecoveryCodes(10);
  const rawSessionToken = generateSessionToken();
  const sessionTokenHash = hashToken(rawSessionToken);
  const sessionExpiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await prisma.$transaction(async (tx) => {
    // 1. Atomically claim the setup challenge conditionally checking affected-row count
    const claimResult = await tx.mfaChallenge.updateMany({
      where: {
        id: challenge.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (claimResult.count !== 1) {
      const error = new Error("MFA setup token has expired or already been used. Please log in again.");
      error.code = "SETUP_TOKEN_EXPIRED";
      error.status = 400;
      throw error;
    }

    await tx.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaSecret: user.mfaPendingSecret,
        mfaPendingSecret: null,
        mfaEnrolledAt: new Date(),
        mfaLastVerifiedStep: verifyResult.timeStep,
      },
    });

    await tx.recoveryCode.deleteMany({
      where: { userId: user.id },
    });

    await tx.recoveryCode.createMany({
      data: hashedCodes.map((codeHash) => ({
        userId: user.id,
        codeHash,
      })),
    });

    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: sessionTokenHash,
        expiresAt: sessionExpiresAt,
        ipAddress,
        userAgent,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "MFA_ENABLED_MANDATORY",
        entityType: "User",
        entityId: user.id,
      },
    });
  }, { maxWait: 10000, timeout: 20000 });

  return {
    user: sanitizeUser(user),
    rawToken: rawSessionToken,
    expiresAt: sessionExpiresAt,
    recoveryCodes: plainCodes,
  };
}

/**
 * Returns MFA status for the authenticated user.
 */
export async function getMfaStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      mfaEnabled: true,
      mfaEnrolledAt: true,
      role: true,
      recoveryCodes: {
        where: { usedAt: null },
        select: { id: true },
      },
    },
  });

  if (!user) {
    const error = new Error("User account not found.");
    error.code = "USER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  return {
    mfaEnabled: user.mfaEnabled,
    enrolledAt: user.mfaEnrolledAt,
    remainingRecoveryCodes: user.recoveryCodes.length,
  };
}
