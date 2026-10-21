/**
 * VERTEX Customer Storefront Order & Address API Service
 * 
 * Provides client methods to interact with authenticated order placement and address endpoints.
 * Enforces:
 * - credentials: "include" for HttpOnly session cookie transmission.
 * - X-Requested-With: "XMLHttpRequest" for strict CSRF protection.
 * - Standardized error handling and parameter formatting.
 */

import { isMockApiEnabled } from "../mock/mockConfig";
import * as mockOrderApi from "../mock/mockOrderApi";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const defaultHeaders = {
  "Content-Type": "application/json",
  "X-Requested-With": "XMLHttpRequest",
};

/**
 * Helper to process API responses safely
 */
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      const error = new Error(`Server returned status ${response.status} (${response.statusText})`);
      error.status = response.status;
      throw error;
    }
    return { success: true };
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || "An unexpected error occurred.";
    const err = new Error(errorMsg);
    err.code = data?.error?.code || data?.code || "REQUEST_FAILED";
    err.status = response.status;
    err.details = data?.error?.details || [];
    throw err;
  }

  return data;
}

/**
 * Places a new order from the user's persistent cart.
 */
export async function placeOrder({
  addressId,
  shippingAddress,
  paymentMethod = "COD",
  notes,
  idempotencyKey,
}) {
  if (isMockApiEnabled()) {
    return mockOrderApi.placeOrder({
      addressId,
      shippingAddress,
      paymentMethod,
      notes,
      idempotencyKey,
    });
  }

  const headers = { ...defaultHeaders };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({
      addressId,
      shippingAddress,
      paymentMethod,
      notes,
      idempotencyKey,
    }),
  });

  return handleResponse(response);
}

/**
 * Retrieves all orders placed by the current user.
 */
export async function getOrders() {
  if (isMockApiEnabled()) {
    return mockOrderApi.getOrders();
  }

  const response = await fetch(`${API_BASE}/api/orders`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Retrieves a single order by ID or orderNumber.
 */
export async function getOrderById(orderIdentifier) {
  if (isMockApiEnabled()) {
    return mockOrderApi.getOrderById(orderIdentifier);
  }

  const response = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderIdentifier)}`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Retrieves the saved addresses for the current user.
 */
export async function getAddresses() {
  if (isMockApiEnabled()) {
    return mockOrderApi.getAddresses();
  }

  const response = await fetch(`${API_BASE}/api/addresses`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Saves a new delivery address for the user.
 */
export async function saveAddress(addressData) {
  if (isMockApiEnabled()) {
    return mockOrderApi.saveAddress(addressData);
  }

  const response = await fetch(`${API_BASE}/api/addresses`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify(addressData),
  });

  return handleResponse(response);
}

/**
 * Deletes a delivery address.
 */
export async function deleteAddress(addressId) {
  if (isMockApiEnabled()) {
    return mockOrderApi.deleteAddress(addressId);
  }

  const response = await fetch(`${API_BASE}/api/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}
