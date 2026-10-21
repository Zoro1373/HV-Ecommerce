import * as categoryService from "../services/category.service.js";

/**
 * Controller to list all active categories.
 */
export async function listCategories(req, res, next) {
  try {
    const categories = await categoryService.listActiveCategories();

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to get a specific active category and its products by slug.
 */
export async function getCategory(req, res, next) {
  try {
    const { slug } = req.params;
    const result = await categoryService.getCategoryBySlug(slug);

    return res.status(200).json({
      success: true,
      category: result.category,
      products: result.products,
    });
  } catch (error) {
    next(error);
  }
}
