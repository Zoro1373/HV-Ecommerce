import { z } from "zod";

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name cannot exceed 100 characters"),
    email: z
      .string()
      .trim()
      .email("A valid email address is required")
      .toLowerCase(),
    password: passwordRule,
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+ -]{10,15}$/, "Invalid phone number format")
      .optional()
      .nullable(),
    accountType: z
      .enum(["CUSTOMER", "B2B"], {
        errorMap: () => ({ message: "accountType must be either CUSTOMER or B2B" }),
      })
      .default("CUSTOMER"),
    companyName: z.string().trim().max(100).optional().nullable(),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(gstinRegex, "Invalid Indian GSTIN format (15 characters)")
      .optional()
      .nullable(),
    // Explicitly reject any client attempt to submit role=ADMIN
    role: z
      .string()
      .refine((val) => val !== "ADMIN", {
        message: "Public registration cannot assign the ADMIN role",
      })
      .optional(),
  })
  .refine(
    (data) => {
      // If B2B is selected with GSTIN, companyName is recommended
      if (data.accountType === "B2B" && data.gstin && !data.companyName) {
        return false;
      }
      return true;
    },
    {
      message: "Company name is required when GSTIN is provided for a B2B account",
      path: ["companyName"],
    }
  );

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("A valid email address is required")
    .toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordRule,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("A valid email address is required")
    .toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32, "Invalid or malformed reset token"),
  newPassword: passwordRule,
});

export const mfaEnrollVerifySchema = z.object({
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "TOTP code must be a 6-digit numeric string"),
});

export const mfaLoginVerifySchema = z.object({
  mfaChallengeToken: z
    .string()
    .trim()
    .min(32, "Invalid or missing MFA challenge token"),
  code: z
    .string()
    .trim()
    .min(6, "Verification code or recovery code is required")
    .max(30, "Invalid code format"),
});

export const mfaDisableSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  code: z
    .string()
    .trim()
    .min(6, "Verification code or recovery code is required")
    .max(30, "Invalid code format"),
});

export const mfaRegenerateRecoverySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
});

export const mfaSetupRequiredStartSchema = z.object({
  mfaSetupToken: z
    .string()
    .trim()
    .min(32, "Invalid or missing MFA setup token"),
});

export const mfaSetupRequiredEnrollSchema = z.object({
  mfaSetupToken: z
    .string()
    .trim()
    .min(32, "Invalid or missing MFA setup token"),
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "TOTP code must be a 6-digit numeric string"),
});

