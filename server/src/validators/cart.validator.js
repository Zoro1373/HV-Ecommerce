import { z } from "zod";

export const addItemSchema = z.object({
  variantId: z
    .string()
    .uuid("Invalid variant identifier format"),
  quantity: z
    .coerce
    .number({ invalid_type_error: "Quantity must be a valid number" })
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(999, "Quantity cannot exceed 999 units")
    .default(1),
});

export const updateItemSchema = z.object({
  quantity: z
    .coerce
    .number({ invalid_type_error: "Quantity must be a valid number" })
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(999, "Quantity cannot exceed 999 units"),
});

export const itemParamSchema = z.object({
  itemId: z
    .string()
    .uuid("Invalid cart item identifier format"),
});

export const mergeCartSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().uuid("Invalid variant identifier format"),
        quantity: z
          .coerce
          .number({ invalid_type_error: "Quantity must be a valid number" })
          .int("Quantity must be an integer")
          .min(1, "Quantity must be at least 1")
          .max(999, "Quantity cannot exceed 999 units"),
      })
    )
    .max(50, "Cannot merge more than 50 items at once"),
});
