/**
 * VERTEX Mock Admin API Service
 * 
 * Provides simulated admin dashboard data, inventory adjustments, and portal telemetry.
 */

import { MOCK_USERS, MOCK_ORDERS } from "./mockData";
import * as mockCatalogApi from "./mockCatalogApi";

function getStoredUser() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem("vertex_mock_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function verifyAdminAuthorization() {
  await new Promise((r) => setTimeout(r, 40));
  const storedUser = getStoredUser();

  // If a simulated non-admin user is explicitly active (e.g. CUSTOMER or B2B), enforce 403 Forbidden
  if (storedUser && storedUser.role !== "ADMIN") {
    const error = new Error("Admin privileges required (Mock Mode).");
    error.status = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  // If stored user is ADMIN or not yet set in dev mode, provide admin authorization
  const admin = (storedUser && storedUser.role === "ADMIN") ? storedUser : MOCK_USERS.admin;
  if (typeof window !== "undefined" && window.localStorage && !storedUser) {
    try {
      window.localStorage.setItem("vertex_mock_user", JSON.stringify(admin));
    } catch {
      // Ignore
    }
  }

  return {
    authorized: true,
    user: admin,
  };
}

export async function getSystemHealth() {
  await new Promise((r) => setTimeout(r, 40));
  return {
    status: "UP",
    database: {
      connected: true,
      type: "PostgreSQL (Frontend Mock Dev Mode)",
    },
    uptime: "99.98%",
    timestamp: new Date().toISOString(),
  };
}

export async function getAdminProducts(params) {
  return mockCatalogApi.getProducts(params);
}

export async function getAdminProductDetails(slugOrId) {
  return mockCatalogApi.getProductBySlug(slugOrId);
}

export async function getAdminCategories() {
  return mockCatalogApi.getCategories();
}

export async function getAdminCategoryDetails(slug) {
  return mockCatalogApi.getCategoryBySlug(slug);
}

export async function createAdminProduct(productData) {
  await new Promise((r) => setTimeout(r, 60));
  return {
    success: true,
    message: "Product created successfully (Mock Dev Mode).",
    product: {
      id: `mock-prod-${Date.now()}`,
      ...productData,
    },
  };
}

export async function createAdminCategory(categoryData) {
  await new Promise((r) => setTimeout(r, 60));
  return {
    success: true,
    message: "Category created successfully (Mock Dev Mode).",
    category: {
      id: `mock-cat-${Date.now()}`,
      ...categoryData,
    },
  };
}

export async function updateVariantStock(variantId, { stockQuantity, reason }) {
  await new Promise((r) => setTimeout(r, 60));
  return {
    success: true,
    message: "Variant stock updated successfully (Mock Dev Mode).",
    variant: {
      id: variantId,
      stockQuantity: Number(stockQuantity),
    },
    difference: 0,
    auditLog: {
      action: "VARIANT_STOCK_ADJUSTMENT",
      reason: reason || "Dev mock inventory update",
      timestamp: new Date().toISOString(),
    },
  };
}

export async function getAdminOrders({ page = 1, limit = 10, status = "" } = {}) {
  await new Promise((r) => setTimeout(r, 50));
  let orders = [...MOCK_ORDERS];
  if (status) {
    orders = orders.filter((o) => o.status === status);
  }
  return {
    isImplemented: true,
    success: true,
    orders,
    pagination: {
      totalItems: orders.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: 1,
    },
  };
}

export async function getAdminCustomers({ page = 1, limit = 10 } = {}) {
  await new Promise((r) => setTimeout(r, 50));
  const customers = [MOCK_USERS.customer, MOCK_USERS.b2b];
  return {
    isImplemented: true,
    success: true,
    customers,
    pagination: {
      totalItems: customers.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: 1,
    },
  };
}

export async function getAdminAuditLogs({ page = 1, limit = 20 } = {}) {
  await new Promise((r) => setTimeout(r, 50));
  const logs = [
    {
      id: "mock-log-1",
      action: "USER_AUTHENTICATION",
      details: "Admin session initialized (Mock Dev Mode)",
      createdAt: new Date().toISOString(),
      actorEmail: "admin@vertex.local",
    },
    {
      id: "mock-log-2",
      action: "CATALOG_INSPECTION",
      details: "Product list retrieved",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      actorEmail: "admin@vertex.local",
    },
  ];
  return {
    isImplemented: true,
    success: true,
    logs,
    pagination: {
      totalItems: logs.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: 1,
    },
  };
}
