import { prisma } from "../config/db.js";
import { formatCategory, formatProduct } from "../utils/catalogSerializer.js";

/**
 * Lists all active categories, optionally organized with subcategories and active product counts.
 */
export async function listActiveCategories() {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      parentId: null, // Top-level categories
    },
    include: {
      children: {
        where: { isActive: true },
        include: {
          _count: {
            select: {
              products: { where: { isActive: true } },
            },
          },
        },
      },
      _count: {
        select: {
          products: { where: { isActive: true } },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return categories.map(formatCategory);
}

/**
 * Retrieves a single active category by its slug, including its active products.
 */
export async function getCategoryBySlug(slug) {
  const normalizedSlug = slug.trim().toLowerCase();

  const category = await prisma.category.findUnique({
    where: { slug: normalizedSlug },
    include: {
      children: {
        where: { isActive: true },
      },
      _count: {
        select: {
          products: { where: { isActive: true } },
        },
      },
    },
  });

  if (!category || !category.isActive) {
    const error = new Error("Category not found.");
    error.code = "CATEGORY_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  // Fetch active products in this category
  const products = await prisma.product.findMany({
    where: {
      categoryId: category.id,
      isActive: true,
    },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        include: {
          tieredPrices: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return {
    category: formatCategory(category),
    products: products.map(formatProduct),
  };
}
