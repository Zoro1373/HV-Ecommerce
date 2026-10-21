import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  mfaEnrollVerifySchema,
  mfaLoginVerifySchema,
  mfaDisableSchema,
  mfaRegenerateRecoverySchema,
  mfaSetupRequiredStartSchema,
  mfaSetupRequiredEnrollSchema,
} from "../validators/auth.validator.js";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  mfaVerifyLimiter,
  mfaEnrollLimiter,
} from "../middleware/rateLimit.middleware.js";
import { authenticateSession } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import * as mfaController from "../controllers/mfa.controller.js";

export const authRouter = Router();

// Public Authentication Endpoints
authRouter.post(
  "/register",
  registerLimiter,
  validateBody(registerSchema),
  authController.register
);

authRouter.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  authController.login
);

authRouter.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);

authRouter.post(
  "/reset-password",
  resetPasswordLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

// Protected Authentication Endpoints
authRouter.post(
  "/logout",
  authenticateSession,
  authController.logout
);

authRouter.get(
  "/me",
  authenticateSession,
  authController.getMe
);

authRouter.post(
  "/change-password",
  authenticateSession,
  validateBody(changePasswordSchema),
  authController.changePassword
);


// Protected Admin Authorization Verification Route
authRouter.get(
  "/admin-check",
  authenticateSession,
  requireRole("ADMIN"),
  authController.adminHealthCheck
);

// ============================================================================
// Multi-Factor Authentication (MFA) Routes
// ============================================================================

// 1. Get MFA Status
authRouter.get(
  "/mfa/status",
  authenticateSession,
  mfaController.getStatus
);

// 2. Start MFA Enrollment
authRouter.post(
  "/mfa/enroll",
  authenticateSession,
  mfaEnrollLimiter,
  mfaController.startEnrollment
);

// 3. Confirm MFA Enrollment
authRouter.post(
  "/mfa/confirm-enroll",
  authenticateSession,
  validateBody(mfaEnrollVerifySchema),
  mfaController.confirmEnrollment
);

// 4. Verify Second-Factor Login Challenge
authRouter.post(
  "/mfa/verify-login",
  mfaVerifyLimiter,
  validateBody(mfaLoginVerifySchema),
  mfaController.verifyMfaLogin
);

// 5. Disable MFA
authRouter.post(
  "/mfa/disable",
  authenticateSession,
  validateBody(mfaDisableSchema),
  mfaController.disableMfa
);

// 6. Regenerate Recovery Codes
authRouter.post(
  "/mfa/recovery-codes",
  authenticateSession,
  validateBody(mfaRegenerateRecoverySchema),
  mfaController.regenerateRecoveryCodes
);

// 7. Restricted Mandatory Setup - Start
authRouter.post(
  "/mfa/setup-required/start",
  mfaEnrollLimiter,
  validateBody(mfaSetupRequiredStartSchema),
  mfaController.startSetupRequired
);

// 8. Restricted Mandatory Setup - Confirm
authRouter.post(
  "/mfa/setup-required/confirm",
  mfaVerifyLimiter,
  validateBody(mfaSetupRequiredEnrollSchema),
  mfaController.confirmSetupRequired
);

