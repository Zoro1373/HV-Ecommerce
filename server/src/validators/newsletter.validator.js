import { z } from "zod";

/**
 * Validation schema for public newsletter subscription.
 */
export const subscribeNewsletterSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .email("Please provide a valid email address.")
    .toLowerCase(),
});

/**
 * Validation schema for administrative newsletter subscriber query parameters.
 */
export const adminNewsletterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  isActive: z.enum(["true", "false", "all", ""]).optional(),
});

/**
 * Validation schema for newsletter subscription ID route parameter.
 */
export const adminNewsletterParamSchema = z.object({
  id: z.string().trim().min(1, "Subscription ID is required."),
});
