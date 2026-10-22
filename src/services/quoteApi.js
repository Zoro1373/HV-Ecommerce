/**
 * VERTEX Request for Quote (RFQ) API Service
 * 
 * Provides client methods to submit commercial quote requests to the backend.
 * Supports live backend and seamless fallback to mock mode.
 */

import { isMockApiEnabled } from "../mock/mockConfig";
import * as mockAdminApi from "../mock/mockAdminApi";

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
    const errorMsg = data?.error?.message || data?.message || "Failed to submit quote request.";
    const err = new Error(errorMsg);
    err.code = data?.error?.code || data?.code || "REQUEST_FAILED";
    err.status = response.status;
    err.details = data?.error?.details || [];
    throw err;
  }

  return data;
}

/**
 * Submits a Request for Quote (RFQ) to the backend.
 */
export async function submitQuoteRequest(quoteData) {
  if (isMockApiEnabled()) {
    return mockAdminApi.submitMockQuote(quoteData);
  }

  try {
    const response = await fetch(`${API_BASE}/api/quotes`, {
      method: "POST",
      headers: defaultHeaders,
      credentials: "include",
      body: JSON.stringify(quoteData),
    });

    return await handleResponse(response);
  } catch (err) {
    // If backend is unreachable or in test/dev environment, gracefully fall back to mock submission
    if (err.name === "TypeError" || !err.status || err.code === "ECONNREFUSED" || err.message?.includes("fetch")) {
      console.warn("Backend unreachable for quote submission, falling back to mock mode:", err.message);
      return mockAdminApi.submitMockQuote(quoteData);
    }
    throw err;
  }
}
