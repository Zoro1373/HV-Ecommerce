import * as mfaService from "../services/mfa.service.js";
import { setSessionCookie } from "./auth.controller.js";

/**
 * Initiates TOTP MFA enrollment for the authenticated user.
 */
export async function startEnrollment(req, res, next) {
  try {
    const result = await mfaService.startMfaEnrollment(req.user.id);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirms TOTP MFA enrollment with the initial 6-digit verification code.
 */
export async function confirmEnrollment(req, res, next) {
  try {
    const { totpCode } = req.body;
    const result = await mfaService.confirmMfaEnrollment(req.user.id, totpCode);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Verifies a second-factor challenge during login using a TOTP or recovery code.
 */
export async function verifyMfaLogin(req, res, next) {
  try {
    const { mfaChallengeToken, code } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await mfaService.verifyMfaLogin({
      mfaChallengeToken,
      code,
      ipAddress,
      userAgent,
    });

    setSessionCookie(res, result.rawToken, result.expiresAt);

    return res.status(200).json({
      success: true,
      message: "MFA verification successful. Logged in.",
      user: result.user,
      usedRecoveryCode: result.usedRecoveryCode,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Disables MFA after verifying current password and a valid code.
 */
export async function disableMfa(req, res, next) {
  try {
    const { currentPassword, code } = req.body;
    const currentToken = req.session?.rawToken;

    const result = await mfaService.disableMfa({
      userId: req.user.id,
      currentPassword,
      code,
      currentToken,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Regenerates recovery codes after verifying current password.
 */
export async function regenerateRecoveryCodes(req, res, next) {
  try {
    const { currentPassword } = req.body;
    const result = await mfaService.regenerateRecoveryCodes({
      userId: req.user.id,
      currentPassword,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Initiates enrollment for a user in a restricted mandatory MFA setup state.
 */
export async function startSetupRequired(req, res, next) {
  try {
    const { mfaSetupToken } = req.body;
    const result = await mfaService.startSetupRequiredEnrollment(mfaSetupToken);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirms mandatory MFA enrollment and issues the full authenticated session upon success.
 */
export async function confirmSetupRequired(req, res, next) {
  try {
    const { mfaSetupToken, totpCode } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await mfaService.confirmSetupRequiredEnrollment({
      mfaSetupToken,
      totpCode,
      ipAddress,
      userAgent,
    });

    setSessionCookie(res, result.rawToken, result.expiresAt);

    return res.status(200).json({
      success: true,
      message: "MFA enrolled successfully. Logged in.",
      user: result.user,
      recoveryCodes: result.recoveryCodes,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns MFA status for the authenticated user.
 */
export async function getStatus(req, res, next) {
  try {
    const status = await mfaService.getMfaStatus(req.user.id);
    return res.status(200).json({
      success: true,
      status,
    });
  } catch (error) {
    next(error);
  }
}
