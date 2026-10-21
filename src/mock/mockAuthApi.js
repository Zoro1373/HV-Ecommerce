/**
 * VERTEX Mock Authentication API Service
 * 
 * Provides simulated login, registration, and session state for frontend development.
 * 
 * CRITICAL SECURITY NOTICE:
 * This module is STRICTLY for local frontend development and isolated UI testing.
 * Mock authentication NEVER runs in production builds and is NEVER authoritative.
 */

import { MOCK_USERS } from "./mockData";

const USER_STORAGE_KEY = "vertex_mock_user";

function getStoredUser() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    if (!user) {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
  } catch {
    // Ignore
  }
}

export async function getCurrentUser() {
  await new Promise((r) => setTimeout(r, 40));
  const user = getStoredUser();
  if (!user) {
    const error = new Error("Not authenticated (Mock Mode: Guest session)");
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }
  return {
    success: true,
    user,
  };
}

export async function loginUser({ email, password }) {
  await new Promise((r) => setTimeout(r, 80));

  const cleanEmail = (email || "").trim().toLowerCase();

  let userToLogin;
  if (cleanEmail === "admin@vertex.local" || cleanEmail.includes("admin")) {
    userToLogin = { ...MOCK_USERS.admin };
  } else if (cleanEmail.includes("b2b")) {
    userToLogin = { ...MOCK_USERS.b2b, email: cleanEmail };
  } else {
    userToLogin = {
      ...MOCK_USERS.customer,
      email: cleanEmail,
      fullName: cleanEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  }

  setStoredUser(userToLogin);

  return {
    success: true,
    user: userToLogin,
    mockNotice: "Simulated Login (Frontend-Only Dev Mode)",
  };
}

export async function verifyMfaLogin({ mfaChallengeToken, code, recoveryCode }) {
  await new Promise((r) => setTimeout(r, 50));
  // In mock mode, any 6-digit code or valid-length string verifies successfully
  const adminUser = { ...MOCK_USERS.admin };
  setStoredUser(adminUser);
  return {
    success: true,
    user: adminUser,
  };
}

export async function registerUser({
  fullName,
  email,
  phone = null,
  accountType = "CUSTOMER",
  companyName = null,
  gstin = null,
}) {
  await new Promise((r) => setTimeout(r, 80));
  const newUser = {
    id: `mock-user-${Date.now()}`,
    fullName: fullName || "New Developer",
    email: (email || "").trim().toLowerCase(),
    phone,
    role: accountType === "B2B" ? "B2B" : "CUSTOMER",
    accountType,
    companyName: companyName || null,
    gstin: gstin || null,
    mfaEnabled: false,
  };

  setStoredUser(newUser);

  return {
    success: true,
    user: newUser,
    message: "Registration successful (Simulated Dev Mode).",
  };
}

export async function requestPasswordReset({ email }) {
  await new Promise((r) => setTimeout(r, 40));
  return {
    success: true,
    message: `Password reset instructions sent to ${email} (Simulated).`,
  };
}

export async function logoutUser() {
  await new Promise((r) => setTimeout(r, 40));
  setStoredUser(null);
  return {
    success: true,
    message: "Logged out successfully (Mock Session Cleared).",
  };
}

export async function verifyAdminAccess() {
  await new Promise((r) => setTimeout(r, 40));
  const user = getStoredUser();
  if (user && user.role === "ADMIN") {
    return {
      authorized: true,
      user,
    };
  }
  const error = new Error("Admin privileges required (Mock Mode).");
  error.status = 403;
  error.code = "FORBIDDEN";
  throw error;
}
