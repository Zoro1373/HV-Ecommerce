import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import { authenticateSession } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import {
  createCategorySchema,
  createProductSchema,
  variantParamSchema,
  updateVariantStockSchema,
} from "../validators/admin.validator.js";

export const adminRouter = Router();

// Enforce server-side authentication and ADMIN role for ALL admin routes
adminRouter.use(authenticateSession);
adminRouter.use(requireRole("ADMIN"));

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
 * POST /api/admin/products
 * Creates a product along with its initial variant in an atomic transaction.
 */
adminRouter.post(
  "/products",
  validateBody(createProductSchema),
  adminController.createProduct
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
