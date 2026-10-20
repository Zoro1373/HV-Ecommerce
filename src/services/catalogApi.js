/**
 * VERTEX Customer Storefront Catalog API Service
 * 
 * Provides client methods to interact with public catalog and category endpoints.
 * Enforces:
 * - credentials: "include" for HttpOnly session cookie transmission.
 * - X-Requested-With: "XMLHttpRequest" for strict CSRF protection.
 * - Standardized error handling and parameter formatting.
 */

import { isMockApiEnabled } from "../mock/mockConfig";
import * as mockCatalogApi from "../mock/mockCatalogApi";

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
 * Fetches all active top-level categories and subcategories from GET /api/categories.
 */
export async function getCategories() {
  if (isMockApiEnabled()) {
    return mockCatalogApi.getCategories();
  }

  const response = await fetch(`${API_BASE}/api/categories`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Fetches a single category and its products by slug from GET /api/categories/:slug.
 */
export async function getCategoryBySlug(slug) {
  if (isMockApiEnabled()) {
    return mockCatalogApi.getCategoryBySlug(slug);
  }

  const response = await fetch(`${API_BASE}/api/categories/${encodeURIComponent(slug)}`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Fetches active products with search, category/brand filter, price range, and sorting.
 * Query parameters supported by backend GET /api/products:
 * - q: keyword search string (searches name, description, brand, tag, SKU, partNumber)
 * - category: category slug or UUID
 * - brand: brand name
 * - minPrice: minimum variant price
 * - maxPrice: maximum variant price
 * - sort: 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc'
 * - page: page number (default 1)
 * - limit: items per page (default 12)
 */
export async function getProducts({
  q = "",
  category = "",
  brand = "",
  minPrice = "",
  maxPrice = "",
  sort = "newest",
  page = 1,
  limit = 12,
} = {}) {
  if (isMockApiEnabled()) {
    return mockCatalogApi.getProducts({
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
    });
  }

  const query = new URLSearchParams();
  if (q && q.trim()) query.set("q", q.trim());
  if (category && category.trim() && category !== "all") query.set("category", category.trim());
  if (brand && brand.trim()) query.set("brand", brand.trim());
  if (minPrice !== "" && !isNaN(minPrice)) query.set("minPrice", minPrice);
  if (maxPrice !== "" && !isNaN(maxPrice)) query.set("maxPrice", maxPrice);
  if (sort) query.set("sort", sort);
  if (page) query.set("page", page);
  if (limit) query.set("limit", limit);

  const response = await fetch(`${API_BASE}/api/products?${query.toString()}`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Fetches a single product and its active variants by slug from GET /api/products/:slug.
 */
export async function getProductBySlug(slug) {
  if (isMockApiEnabled()) {
    return mockCatalogApi.getProductBySlug(slug);
  }

  const response = await fetch(`${API_BASE}/api/products/${encodeURIComponent(slug)}`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}
