import { z } from "zod";

/**
 * Validator for creating a category via Admin API.
 */
export const createCategorySchema = z.object({
  name: z
    .string({ required_error: "Category name is required" })
    .trim()
    .min(1, "Category name cannot be empty")
    .max(100, "Category name cannot exceed 100 characters"),
  slug: z
    .string({ required_error: "Category slug is required" })
    .trim()
    .min(1, "Category slug cannot be empty")
    .max(120, "Category slug cannot exceed 120 characters")
    .regex(/^[a-zA-Z0-9-_]+$/, "Slug must only contain letters, numbers, hyphens, and underscores"),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional()
    .nullable(),
  icon: z
    .string()
    .trim()
    .max(50, "Icon identifier cannot exceed 50 characters")
    .optional()
    .nullable(),
  tint: z
    .string()
    .trim()
    .max(50, "Tint identifier cannot exceed 50 characters")
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .trim()
    .max(500, "Image URL cannot exceed 500 characters")
    .optional()
    .nullable(),
  parentId: z
    .string()
    .trim()
    .uuid("Parent category ID must be a valid UUID")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

/**
 * Validator for creating a product with its initial variant via Admin API.
 */
export const createProductSchema = z.object({
  name: z
    .string({ required_error: "Product name is required" })
    .trim()
    .min(1, "Product name cannot be empty")
    .max(200, "Product name cannot exceed 200 characters"),
  slug: z
    .string({ required_error: "Product slug is required" })
    .trim()
    .min(1, "Product slug cannot be empty")
    .max(120, "Product slug cannot exceed 120 characters")
    .regex(/^[a-zA-Z0-9-_]+$/, "Slug must only contain letters, numbers, hyphens, and underscores"),
  categoryId: z
    .string({ required_error: "Category ID is required" })
    .trim()
    .min(1, "Category ID is required"),
  brand: z
    .string()
    .trim()
    .max(100, "Brand cannot exceed 100 characters")
    .optional()
    .nullable(),
  hsnCode: z
    .string()
    .trim()
    .max(20, "HSN code cannot exceed 20 characters")
    .optional()
    .nullable(),
  gstRate: z
    .coerce
    .number({ invalid_type_error: "GST rate must be a number" })
    .min(0, "GST rate cannot be negative")
    .max(100, "GST rate cannot exceed 100%")
    .default(18.0),
  tag: z
    .string()
    .trim()
    .max(50, "Tag cannot exceed 50 characters")
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .trim()
    .max(500, "Image URL cannot exceed 500 characters")
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .optional()
    .nullable(),
  // Initial Variant Fields
  sku: z
    .string({ required_error: "Variant SKU is required" })
    .trim()
    .min(1, "Variant SKU cannot be empty")
    .max(100, "Variant SKU cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9-_]+$/, "SKU must only contain alphanumeric characters, hyphens, and underscores"),
  partNumber: z
    .string()
    .trim()
    .max(100, "Part number cannot exceed 100 characters")
    .optional()
    .nullable(),
  variantName: z
    .string()
    .trim()
    .max(150, "Variant name cannot exceed 150 characters")
    .optional()
    .nullable(),
  packSize: z
    .string()
    .trim()
    .max(50, "Pack size cannot exceed 50 characters")
    .optional()
    .nullable(),
  dimensions: z
    .string()
    .trim()
    .max(100, "Dimensions cannot exceed 100 characters")
    .optional()
    .nullable(),
  price: z
    .coerce
    .number({ required_error: "Price is required", invalid_type_error: "Price must be a number" })
    .min(0, "Price cannot be negative"),
  mrp: z
    .coerce
    .number({ invalid_type_error: "MRP must be a number" })
    .min(0, "MRP cannot be negative")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  stockQuantity: z
    .coerce
    .number({ invalid_type_error: "Stock quantity must be an integer" })
    .int("Stock quantity must be an integer")
    .min(0, "Stock quantity cannot be negative")
    .default(0),
});

/**
 * Validator for variant route parameter.
 */
export const variantParamSchema = z.object({
  id: z
    .string({ required_error: "Variant ID is required" })
    .trim()
    .min(1, "Variant ID is required"),
});

/**
 * Validator for variant stock update body.
 */
export const updateVariantStockSchema = z.object({
  stockQuantity: z
    .coerce
    .number({ required_error: "Stock quantity is required", invalid_type_error: "Stock quantity must be an integer" })
    .int("Stock quantity must be an integer")
    .min(0, "Stock quantity cannot be negative"),
  reason: z
    .string({ required_error: "Adjustment reason is required" })
    .trim()
    .min(1, "Adjustment reason cannot be empty")
    .max(500, "Adjustment reason cannot exceed 500 characters"),
});
