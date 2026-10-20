/**
 * VERTEX Frontend Authentication API Service
 * 
 * Interacts with the backend Express authentication API endpoints.
 * Enforces security contracts:
 * - credentials: "include" for HttpOnly session cookie transport.
 * - X-Requested-With: "XMLHttpRequest" for strict CSRF protection.
 * - Never stores passwords, tokens, or auth secrets in localStorage or sessionStorage.
 */

import { isMockApiEnabled } from "../mock/mockConfig";
import * as mockAuthApi from "../mock/mockAuthApi";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const defaultHeaders = {
  "Content-Type": "application/json",
  "X-Requested-With": "XMLHttpRequest",
};

/**
 * Helper to process API responses and format error messages safely
 */
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status} (${response.statusText})`);
    }
    return { success: true };
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || "An unexpected error occurred. Please try again.";
    const err = new Error(errorMsg);
    err.code = data?.error?.code || data?.code || "REQUEST_FAILED";
    err.status = response.status;
    err.details = data?.error?.details || [];
    throw err;
  }

  return data;
}

/**
 * Logs in with email and password.
 * If MFA is enabled, returns { mfaRequired: true, mfaChallengeToken: "..." }.
 * If MFA setup is mandatory for the role, returns { mfaSetupRequired: true, mfaSetupToken: "..." }.
 * If normal login succeeds, returns { success: true, user: { ... } } and sets the vertex_session cookie.
 */
export async function loginUser({ email, password }) {
  if (isMockApiEnabled()) {
    return mockAuthApi.loginUser({ email, password });
  }

  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  return handleResponse(response);
}

/**
 * Verifies a second-factor challenge during login using a 6-digit TOTP code or recovery code.
 */
export async function verifyMfaLogin({ mfaChallengeToken, code, recoveryCode }) {
  if (isMockApiEnabled()) {
    return mockAuthApi.verifyMfaLogin({ mfaChallengeToken, code, recoveryCode });
  }

  const payload = { mfaChallengeToken };
  if (code) {
    payload.code = code.trim();
  }
  if (recoveryCode) {
    payload.recoveryCode = recoveryCode.trim().toUpperCase();
  }

  const response = await fetch(`${API_BASE}/api/auth/mfa/verify-login`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

/**
 * Registers a new customer or B2B account.
 */
export async function registerUser({
  fullName,
  email,
  password,
  phone = null,
  accountType = "CUSTOMER",
  companyName = null,
  gstin = null,
}) {
  if (isMockApiEnabled()) {
    return mockAuthApi.registerUser({
      fullName,
      email,
      password,
      phone,
      accountType,
      companyName,
      gstin,
    });
  }

  const payload = {
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    password,
    accountType,
  };

  if (phone && phone.trim()) payload.phone = phone.trim();
  if (accountType === "B2B") {
    if (companyName && companyName.trim()) payload.companyName = companyName.trim();
    if (gstin && gstin.trim()) payload.gstin = gstin.trim().toUpperCase();
  }

  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

/**
 * Initiates a password reset request.
 */
export async function requestPasswordReset({ email }) {
  if (isMockApiEnabled()) {
    return mockAuthApi.requestPasswordReset({ email });
  }

  const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  return handleResponse(response);
}

/**
 * Fetches the currently authenticated user profile from the server using the HttpOnly session cookie.
 */
export async function getCurrentUser() {
  if (isMockApiEnabled()) {
    return mockAuthApi.getCurrentUser();
  }

  const response = await fetch(`${API_BASE}/api/auth/me`, {
    method: "GET",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Logs out the user and invalidates the session in PostgreSQL.
 */
export async function logoutUser() {
  if (isMockApiEnabled()) {
    return mockAuthApi.logoutUser();
  }

  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Checks if the current session has verified ADMIN permissions.
 */
export async function verifyAdminAccess() {
  if (isMockApiEnabled()) {
    return mockAuthApi.verifyAdminAccess();
  }

  const response = await fetch(`${API_BASE}/api/auth/admin-check`, {
    method: "GET",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include",
  });

  return handleResponse(response);
}
