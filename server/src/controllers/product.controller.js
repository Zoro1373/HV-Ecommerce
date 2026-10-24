import * as productService from "../services/product.service.js";

/**
 * Controller to list active products with pagination, search, category/price filter, and sorting.
 */
export async function listProducts(req, res, next) {
  try {
    const {
      q,
      category,
      subcat,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      inStockOnly,
      sort,
      page,
      limit,
    } = req.query;

    const result = await productService.listProducts({
      q,
      category,
      subcat: subcat || subcategory,
      brand,
      minPrice,
      maxPrice,
      inStockOnly,
      sort,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      products: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to get product details and active variants by slug or ID.
 */
export async function getProduct(req, res, next) {
  try {
    const identifier = req.params.slug || req.params.id;
    const product = await productService.getProductBySlugOrId(identifier);

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to retrieve active variants of a specific product.
 */
export async function getProductVariants(req, res, next) {
  try {
    const identifier = req.params.slug || req.params.id;
    const variants = await productService.getProductVariants(identifier);

    return res.status(200).json({
      success: true,
      variants,
    });
  } catch (error) {
    next(error);
  }
}
