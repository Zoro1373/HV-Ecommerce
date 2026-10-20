/**
 * VERTEX Mock Catalog API Service
 * 
 * Provides simulated catalog browsing, search, category filtering, and product details.
 */

import { MOCK_CATEGORIES, MOCK_PRODUCTS } from "./mockData";

export async function getCategories() {
  // Simulate standard network micro-delay
  await new Promise((r) => setTimeout(r, 40));
  return {
    success: true,
    count: MOCK_CATEGORIES.length,
    categories: [...MOCK_CATEGORIES],
  };
}

export async function getCategoryBySlug(slug) {
  await new Promise((r) => setTimeout(r, 40));
  const decoded = decodeURIComponent(slug).toLowerCase();
  const category = MOCK_CATEGORIES.find(
    (c) => c.slug.toLowerCase() === decoded || c.id === decoded
  );

  if (!category) {
    const error = new Error(`Category "${slug}" not found.`);
    error.status = 404;
    error.code = "CATEGORY_NOT_FOUND";
    throw error;
  }

  const products = MOCK_PRODUCTS.filter(
    (p) => p.categoryId === category.id || p.category?.slug === category.slug
  );

  return {
    success: true,
    category,
    products,
  };
}

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
  await new Promise((r) => setTimeout(r, 50));

  let filtered = [...MOCK_PRODUCTS];

  // 1. Keyword search (case-insensitive across name, description, brand, tag, SKU, partNumber)
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    filtered = filtered.filter((product) => {
      const matchName = product.name?.toLowerCase().includes(term);
      const matchDesc = product.description?.toLowerCase().includes(term);
      const matchBrand = product.brand?.toLowerCase().includes(term);
      const matchTag = product.tag?.toLowerCase().includes(term);
      const matchVariant = product.variants?.some(
        (v) =>
          v.sku?.toLowerCase().includes(term) ||
          v.partNumber?.toLowerCase().includes(term) ||
          v.name?.toLowerCase().includes(term)
      );
      return matchName || matchDesc || matchBrand || matchTag || matchVariant;
    });
  }

  // 2. Category filter
  if (category && category.trim() && category !== "all") {
    const cat = category.trim().toLowerCase();
    filtered = filtered.filter(
      (p) => p.category?.slug?.toLowerCase() === cat || p.categoryId === cat
    );
  }

  // 3. Brand filter
  if (brand && brand.trim()) {
    const b = brand.trim().toLowerCase();
    filtered = filtered.filter((p) => p.brand?.toLowerCase() === b);
  }

  // 4. Price range filter
  if (minPrice !== "" && !isNaN(minPrice)) {
    const min = Number(minPrice);
    filtered = filtered.filter((p) => Number(p.price) >= min);
  }
  if (maxPrice !== "" && !isNaN(maxPrice)) {
    const max = Number(maxPrice);
    filtered = filtered.filter((p) => Number(p.price) <= max);
  }

  // 5. Sorting
  if (sort === "price_asc") {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sort === "price_desc") {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sort === "name_asc") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "name_desc") {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  }

  // 6. Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 12);
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limitNum));
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedProducts = filtered.slice(startIndex, startIndex + limitNum);

  return {
    success: true,
    products: paginatedProducts,
    pagination: {
      currentPage: pageNum,
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
    },
  };
}

export async function getProductBySlug(slug) {
  await new Promise((r) => setTimeout(r, 40));
  const decoded = decodeURIComponent(slug).toLowerCase();
  const product = MOCK_PRODUCTS.find(
    (p) => p.slug.toLowerCase() === decoded || p.id === decoded
  );

  if (!product) {
    const error = new Error(`Product "${slug}" not found.`);
    error.status = 404;
    error.code = "PRODUCT_NOT_FOUND";
    throw error;
  }

  return {
    success: true,
    product,
  };
}
