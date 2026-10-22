import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import { authenticateSession } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.middleware.js";
import {
  createCategorySchema,
  adminCategoryParamSchema,
  updateCategorySchema,
  createProductSchema,
  adminProductParamSchema,
  updateProductSchema,
  updateProductPriceSchema,
  variantParamSchema,
  updateVariantStockSchema,
  adminOrdersQuerySchema,
  adminOrderParamSchema,
  updateOrderStatusSchema,
  adminCustomersQuerySchema,
  adminCustomerParamSchema,
  adminCustomerDetailsQuerySchema,
  adminAuditLogsQuerySchema,
} from "../validators/admin.validator.js";
import {
  adminQuotesQuerySchema,
  adminQuoteParamSchema,
  updateQuoteSchema,
} from "../validators/quote.validator.js";
import {
  adminNewsletterQuerySchema,
} from "../validators/newsletter.validator.js";

export const adminRouter = Router();

// Enforce server-side authentication and ADMIN role for ALL admin routes
adminRouter.use(authenticateSession);
adminRouter.use(requireRole("ADMIN"));

/**
 * GET /api/admin/audit-logs
 * Lists security and operational audit logs with pagination, search, action, and entity type filters.
 */
adminRouter.get(
  "/audit-logs",
  validateQuery(adminAuditLogsQuerySchema),
  adminController.listAuditLogs
);

/**
 * GET /api/admin/customers
 * Lists customer accounts (CUSTOMER and B2B) with pagination, search, and role filters.
 */
adminRouter.get(
  "/customers",
  validateQuery(adminCustomersQuerySchema),
  adminController.listCustomers
);

/**
 * GET /api/admin/customers/:id
 * Retrieves full details for a single customer by ID including profile, addresses, orders, and RFQs.
 */
adminRouter.get(
  "/customers/:id",
  validateParams(adminCustomerParamSchema),
  validateQuery(adminCustomerDetailsQuerySchema),
  adminController.getCustomer
);


/**
 * GET /api/admin/orders
 * Lists all orders across the system with pagination, search, and status filters.
 */
adminRouter.get(
  "/orders",
  validateQuery(adminOrdersQuerySchema),
  adminController.listOrders
);

/**
 * GET /api/admin/orders/:id
 * Retrieves a single order by UUID or orderNumber with customer, items, and fulfillment tracking info.
 */
adminRouter.get(
  "/orders/:id",
  validateParams(adminOrderParamSchema),
  adminController.getOrder
);

/**
 * PATCH /api/admin/orders/:id/status
 * Updates order fulfillment status with state machine validation and audit logging.
 */
adminRouter.patch(
  "/orders/:id/status",
  validateParams(adminOrderParamSchema),
  validateBody(updateOrderStatusSchema),
  adminController.updateOrderStatus
);

/**
 * POST /api/admin/categories
 * Creates a new category with slug uniqueness and hierarchy checks.
 */
adminRouter.post(
  "/categories",
  validateBody(createCategorySchema),
  adminController.createCategory
);

/**
 * PATCH /api/admin/categories/:id
 * Updates category details, parent hierarchy, and active status with audit logging.
 */
adminRouter.patch(
  "/categories/:id",
  validateParams(adminCategoryParamSchema),
  validateBody(updateCategorySchema),
  adminController.updateCategory
);

/**
 * POST /api/admin/products
 * Creates a product along with its initial variant in an atomic transaction.
 */
adminRouter.post(
  "/products",
  validateBody(createProductSchema),
  adminController.createProduct
);

/**
 * PATCH /api/admin/products/:id
 * Updates product details and category assignment with validation and audit logging.
 */
adminRouter.patch(
  "/products/:id",
  validateParams(adminProductParamSchema),
  validateBody(updateProductSchema),
  adminController.updateProduct
);

/**
 * PATCH /api/admin/products/:id/price
 * Updates product selling price on its primary or specified variant with validation and audit logging.
 */
adminRouter.patch(
  "/products/:id/price",
  validateParams(adminProductParamSchema),
  validateBody(updateProductPriceSchema),
  adminController.updateProductPrice
);

/**
 * PATCH /api/admin/inventory/variants/:id
 * Updates variant stock quantity safely and writes an audit log record.
 */
adminRouter.patch(
  "/inventory/variants/:id",
  validateParams(variantParamSchema),
  validateBody(updateVariantStockSchema),
  adminController.updateVariantStock
);

/**
 * GET /api/admin/quotes
 * Lists all commercial RFQ quote requests with pagination, search, and status filters.
 */
adminRouter.get(
  "/quotes",
  validateQuery(adminQuotesQuerySchema),
  adminController.listQuotes
);

/**
 * GET /api/admin/quotes/:id
 * Retrieves a single quote request by UUID.
 */
adminRouter.get(
  "/quotes/:id",
  validateParams(adminQuoteParamSchema),
  adminController.getQuote
);

/**
 * PATCH /api/admin/quotes/:id
 * Updates quote status, notes, or pricing proposal with audit logging.
 */
adminRouter.patch(
  "/quotes/:id",
  validateParams(adminQuoteParamSchema),
  validateBody(updateQuoteSchema),
  adminController.updateQuote
);

/**
 * GET /api/admin/newsletter
 * Lists newsletter subscriptions for administrative audit and export.
 */
adminRouter.get(
  "/newsletter",
  validateQuery(adminNewsletterQuerySchema),
  adminController.listNewsletterSubscriptions
);

