import * as adminService from "../services/admin.service.js";

/**
 * Controller to create a category via Admin API.
 */
export async function createCategory(req, res, next) {
  try {
    const actorId = req.user?.id || null;
    const category = await adminService.createCategory(req.body, actorId);

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to create a product and its initial variant via Admin API.
 */
export async function createProduct(req, res, next) {
  try {
    const actorId = req.user?.id || null;
    const product = await adminService.createProduct(req.body, actorId);

    return res.status(201).json({
      success: true,
      message: "Product and initial variant created successfully.",
      product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to adjust inventory stock for a variant via Admin API.
 */
export async function updateVariantStock(req, res, next) {
  try {
    const { id } = req.params;
    const actorId = req.user?.id || null;
    const actorEmail = req.user?.email || null;

    const result = await adminService.updateVariantStock(
      id,
      req.body,
      actorId,
      actorEmail
    );

    return res.status(200).json({
      success: true,
      message: "Variant stock updated successfully.",
      variant: result.variant,
      difference: result.difference,
      auditLog: result.auditLog,
    });
  } catch (error) {
    next(error);
  }
}
