import * as authService from "../services/auth.service.js";
import { SESSION_COOKIE_NAME } from "../middleware/auth.middleware.js";

/**
 * Sets the secure HttpOnly session cookie on the response.
 */
export function setSessionCookie(res, rawToken, expiresAt) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}

/**
 * Clears the session cookie on the response.
 */
export function clearSessionCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}

export async function register(req, res, next) {
  try {
    const { fullName, email, password, phone, accountType, companyName, gstin } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const { user, rawToken, expiresAt } = await authService.registerUser({
      fullName,
      email,
      password,
      phone,
      accountType,
      companyName,
      gstin,
      ipAddress,
      userAgent,
    });

    setSessionCookie(res, rawToken, expiresAt);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await authService.loginUser({
      email,
      password,
      ipAddress,
      userAgent,
    });

    if (result.mfaRequired) {
      return res.status(200).json({
        mfaRequired: true,
        mfaChallengeToken: result.mfaChallengeToken,
        expiresInSeconds: result.expiresInSeconds,
        message: "MFA second-factor verification required.",
      });
    }

    if (result.mfaSetupRequired) {
      return res.status(200).json({
        mfaSetupRequired: true,
        mfaSetupToken: result.mfaSetupToken,
        expiresInSeconds: result.expiresInSeconds,
        message: result.message,
        user: result.user,
      });
    }

    setSessionCookie(res, result.rawToken, result.expiresAt);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const rawToken = req.session?.rawToken || req.cookies?.[SESSION_COOKIE_NAME];
    await authService.logoutUser(rawToken);
    clearSessionCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res) {
  return res.status(200).json({
    user: req.user,
  });
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const currentToken = req.session?.rawToken;

    await authService.changePassword(userId, currentPassword, newPassword, currentToken);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Other active sessions have been revoked.",
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);

    return res.status(200).json({
      success: true,
      message: result.message,
      emailProviderConfigured: result.emailProviderConfigured,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword({ token, newPassword });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

export async function adminHealthCheck(req, res) {
  return res.status(200).json({
    status: "AUTHORIZED",
    message: "Admin authorization verified successfully.",
    user: req.user,
  });
}
