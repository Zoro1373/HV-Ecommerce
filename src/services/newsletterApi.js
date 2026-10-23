/**
 * VERTEX Newsletter Subscription API Service
 * 
 * Provides client methods to subscribe to marketing and catalog updates.
 * Supports live backend and fallback to simulated mock response.
 */

import { isMockApiEnabled } from "../mock/mockConfig";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const defaultHeaders = {
  "Content-Type": "application/json",
  "X-Requested-With": "XMLHttpRequest",
};

async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      const error = new Error(`Server returned status ${response.status} (${response.statusText})`);
      error.status = response.status;
      throw error;
    }
    return { success: true };
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || "Failed to subscribe to newsletter.";
    const err = new Error(errorMsg);
    err.code = data?.error?.code || data?.code || "REQUEST_FAILED";
    err.status = response.status;
    err.details = data?.error?.details || [];
    throw err;
  }

  return data;
}

/**
 * Subscribes an email to the VERTEX newsletter.
 */
export async function subscribeNewsletter(email) {
  if (isMockApiEnabled()) {
    await new Promise((r) => setTimeout(r, 60));
    return {
      success: true,
      message: "Thank you for subscribing to VERTEX updates.",
    };
  }

  try {
    const response = await fetch(`${API_BASE}/api/newsletter/subscribe`, {
      method: "POST",
      headers: defaultHeaders,
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    return await handleResponse(response);
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      console.warn("Backend unreachable for newsletter subscription, falling back to mock response:", err.message);
      return {
        success: true,
        message: "Thank you for subscribing to VERTEX updates.",
      };
    }
    throw err;
  }
}
