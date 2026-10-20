/**
 * VERTEX Mock API Configuration & Development Guard
 * 
 * Strict Security Guard:
 * Mock mode is NEVER permitted in production builds (NODE_ENV === "production").
 * Any attempt to use mock auth or mock checkout in production is strictly blocked.
 */

const STORAGE_KEY = "vertex_mock_mode";

/**
 * Checks if mock mode is active.
 * Guarantees false in production builds.
 */
export function isMockApiEnabled() {
  // 1. Strict production guard - ALWAYS false in production builds
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // 2. Explicit environment variable check
  if (
    process.env.REACT_APP_USE_MOCK_API === "true" ||
    process.env.REACT_APP_USE_MOCK_API === "1"
  ) {
    return true;
  }

  // 3. Local session / query string override for frontend developers in development
  if (typeof window !== "undefined") {
    try {
      const sessionSetting = window.sessionStorage.getItem(STORAGE_KEY);
      if (sessionSetting === "true") return true;
      if (sessionSetting === "false") return false;

      if (window.location && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        if (params.get("mock") === "true") {
          window.sessionStorage.setItem(STORAGE_KEY, "true");
          return true;
        }
        if (params.get("mock") === "false") {
          window.sessionStorage.setItem(STORAGE_KEY, "false");
          return false;
        }
      }
    } catch {
      // Ignore sessionStorage access errors (e.g. cross-origin iframes)
    }
  }

  return false;
}

/**
 * Allows switching mock mode dynamically in development.
 * Has no effect in production.
 */
export function setMockMode(enabled) {
  if (process.env.NODE_ENV === "production") return;
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    } catch {
      // Ignore
    }
  }
}
