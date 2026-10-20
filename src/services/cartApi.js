/**
 * VERTEX Persistent Cart API Service
 * 
 * Provides client methods to interact with authenticated customer cart endpoints.
 * Enforces:
 * - credentials: "include" for HttpOnly session cookie transmission.
 * - X-Requested-With: "XMLHttpRequest" for strict CSRF protection.
 * - Server-authoritative price derivation and validation.
 */

import { isMockApiEnabled } from "../mock/mockConfig";
import * as mockCartApi from "../mock/mockCartApi";

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
    const errorMsg = data?.error?.message || data?.message || "An unexpected cart error occurred.";
    const err = new Error(errorMsg);
    err.code = data?.error?.code || data?.code || "CART_REQUEST_FAILED";
    err.status = response.status;
    err.details = data?.error?.details || [];
    throw err;
  }

  return data;
}

/**
 * Retrieves the current authenticated user's cart and calculated subtotal.
 */
export async function getCart() {
  if (isMockApiEnabled()) {
    return mockCartApi.getCart();
  }

  const response = await fetch(`${API_BASE}/api/cart`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Adds a product variant with positive quantity to the current user's cart.
 */
export async function addItemToCart({ variantId, quantity = 1 }) {
  if (isMockApiEnabled()) {
    return mockCartApi.addItemToCart({ variantId, quantity });
  }

  const response = await fetch(`${API_BASE}/api/cart/items`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify({ variantId, quantity }),
  });

  return handleResponse(response);
}

/**
 * Updates the quantity of an existing cart item.
 */
export async function updateCartItemQuantity(itemId, quantity) {
  if (isMockApiEnabled()) {
    return mockCartApi.updateCartItemQuantity(itemId, quantity);
  }

  const response = await fetch(`${API_BASE}/api/cart/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify({ quantity }),
  });

  return handleResponse(response);
}

/**
 * Removes an item from the current user's cart.
 */
export async function removeCartItem(itemId) {
  if (isMockApiEnabled()) {
    return mockCartApi.removeCartItem(itemId);
  }

  const response = await fetch(`${API_BASE}/api/cart/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Clears all items from the current user's cart.
 */
export async function clearCart() {
  if (isMockApiEnabled()) {
    return mockCartApi.clearCart();
  }

  const response = await fetch(`${API_BASE}/api/cart`, {
    method: "DELETE",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Merges validated guest cart items into the authenticated user's cart upon login.
 */
export async function mergeGuestCart(items = []) {
  if (isMockApiEnabled()) {
    return mockCartApi.mergeGuestCart(items);
  }

  const response = await fetch(`${API_BASE}/api/cart/merge`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify({ items }),
  });

  return handleResponse(response);
}
