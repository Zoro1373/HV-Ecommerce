import { z } from "zod";

/**
 * Validation schema for public/customer RFQ submission.
 */
export const createQuoteSchema = z.object({
  contactName: z
    .string({ required_error: "Contact name is required." })
    .trim()
    .min(1, "Contact name is required.")
    .max(100, "Contact name cannot exceed 100 characters."),
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .email("Please provide a valid email address.")
    .toLowerCase(),
  phone: z
    .string({ required_error: "Phone number is required." })
    .trim()
    .min(5, "Phone number must be at least 5 characters.")
    .max(25, "Phone number cannot exceed 25 characters."),
  companyName: z
    .string()
    .trim()
    .max(100, "Company name cannot exceed 100 characters.")
    .optional()
    .nullable(),
  gstin: z
    .string()
    .trim()
    .max(25, "GSTIN cannot exceed 25 characters.")
    .optional()
    .nullable(),
  productDetails: z
    .string({ required_error: "Product details or SKU is required." })
    .trim()
    .min(1, "Product details or SKU is required.")
    .max(500, "Product details cannot exceed 500 characters."),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a valid number." })
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1 unit.")
    .max(1000000, "Quantity cannot exceed 1,000,000 units."),
  message: z
    .string()
    .trim()
    .max(2000, "Message cannot exceed 2,000 characters.")
    .optional()
    .nullable(),
});

/**
 * Validation schema for administrative quotes listing query parameters.
 */
export const adminQuotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z
    .enum(["PENDING", "UNDER_REVIEW", "QUOTED", "ACCEPTED", "REJECTED", "EXPIRED", ""])
    .optional()
    .nullable(),
  search: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
});

/**
 * Validation schema for quote ID route parameter.
 */
export const adminQuoteParamSchema = z.object({
  id: z.string().trim().min(1, "Quote ID is required."),
});

/**
 * Validation schema for administrative quote status and workflow updates.
 */
export const updateQuoteSchema = z
  .object({
    status: z
      .enum(["PENDING", "UNDER_REVIEW", "QUOTED", "ACCEPTED", "REJECTED", "EXPIRED"])
      .optional(),
    adminNotes: z
      .string()
      .trim()
      .max(2000, "Admin notes cannot exceed 2,000 characters.")
      .optional()
      .nullable(),
    quotedAmount: z.coerce
      .number({ invalid_type_error: "Quoted amount must be a number." })
      .min(0, "Quoted amount cannot be negative.")
      .optional()
      .nullable(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.adminNotes !== undefined ||
      data.quotedAmount !== undefined,
    {
      message:
        "At least one update field (status, adminNotes, or quotedAmount) must be provided.",
    }
  );
