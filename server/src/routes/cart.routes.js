import { Router } from "express";
import * as cartController from "../controllers/cart.controller.js";
import { authenticateSession } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import {
  addItemSchema,
  updateItemSchema,
  itemParamSchema,
  mergeCartSchema,
} from "../validators/cart.validator.js";

export const cartRouter = Router();

// All cart endpoints require user authentication & CSRF validation
cartRouter.use(authenticateSession);

/**
 * GET /api/cart
 * Retrieves the current authenticated user's cart and calculated subtotal.
 */
cartRouter.get("/", cartController.getCart);

/**
 * DELETE /api/cart
 * Clears all items from the current user's cart.
 */
cartRouter.delete("/", cartController.clearCart);

/**
 * POST /api/cart/items
 * Adds a product variant with validated positive quantity to the cart.
 */
cartRouter.post("/items", validateBody(addItemSchema), cartController.addItem);

/**
 * PATCH /api/cart/items/:itemId
 * Updates the quantity of a specific cart line item.
 */
cartRouter.patch(
  "/items/:itemId",
  validateParams(itemParamSchema),
  validateBody(updateItemSchema),
  cartController.updateItem
);

/**
 * DELETE /api/cart/items/:itemId
 * Removes a specific cart line item.
 */
cartRouter.delete(
  "/items/:itemId",
  validateParams(itemParamSchema),
  cartController.removeItem
);

/**
 * POST /api/cart/merge
 * Merges validated guest cart items into the authenticated user's cart.
 */
cartRouter.post("/merge", validateBody(mergeCartSchema), cartController.mergeCart);
