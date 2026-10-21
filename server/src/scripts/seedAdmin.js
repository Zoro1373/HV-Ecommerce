import dotenv from "dotenv";
import { prisma } from "../config/db.js";
import { hashPassword } from "../utils/crypto.js";

dotenv.config();

/**
 * Safely provisions an administrator account.
 * - Never prints passwords or secrets.
 * - Validates inputs and password strength.
 * - Refuses to silently promote an ordinary customer/B2B account to administrator.
 * - Idempotent and safe to run repeatedly for an existing ADMIN account.
 */
export async function provisionAdmin({
  email,
  password,
  name = "VERTEX Administrator",
  resetMfa = false,
} = {}) {
  const adminEmail = email?.trim().toLowerCase();
  const adminPassword = password;
  const adminName = name?.trim() || "VERTEX Administrator";

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to provision an administrator.");
  }

  // Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error("Invalid administrator email address format.");
  }

  if (adminPassword.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  const passwordHash = await hashPassword(adminPassword);

  if (existingUser) {
    // Explicit protection: Refuse to silently elevate an ordinary customer/B2B account to administrator
    if (existingUser.role !== "ADMIN") {
      throw new Error(
        `Account ${adminEmail} already exists with role '${existingUser.role}'. Refusing to silently promote an ordinary account to ADMIN.`
      );
    }

    if (resetMfa) {
      await prisma.recoveryCode.deleteMany({
        where: { userId: existingUser.id },
      });
      await prisma.mfaChallenge.deleteMany({
        where: { userId: existingUser.id },
      });
    }

    // Existing admin account: safe to update credentials and metadata repeatedly
    const updatedAdmin = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        fullName: adminName,
        passwordHash,
        isActive: true,
        emailVerified: true,
        ...(resetMfa
          ? {
              mfaEnabled: false,
              mfaSecret: null,
              mfaPendingSecret: null,
              mfaLastVerifiedStep: null,
            }
          : {}),
      },
    });

    return {
      action: "UPDATED",
      userId: updatedAdmin.id,
      email: updatedAdmin.email,
      role: updatedAdmin.role,
    };
  }

  // Create new administrator account
  const newAdmin = await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: adminName,
      passwordHash,
      role: "ADMIN",
      isActive: true,
      emailVerified: true,
    },
  });

  return {
    action: "CREATED",
    userId: newAdmin.id,
    email: newAdmin.email,
    role: newAdmin.role,
  };
}

// CLI runner for `npm run seed:admin`
const isCliExecution =
  process.argv[1]?.replace(/\\/g, "/").endsWith("src/scripts/seedAdmin.js") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("seedAdmin.js");

if (isCliExecution) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;
  const resetMfa = process.argv.includes("--reset-mfa") || process.env.RESET_MFA === "true";

  provisionAdmin({ email, password, name, resetMfa })
    .then((res) => {
      const extra = resetMfa ? " (MFA reset to disabled)" : "";
      console.log(`✓ Administrator account (${res.email}) ${res.action.toLowerCase()} successfully with role ADMIN.${extra}`);
    })
    .catch((err) => {
      console.error(`ERROR: ${err.message}`);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
