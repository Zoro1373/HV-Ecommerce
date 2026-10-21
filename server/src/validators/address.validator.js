import { z } from "zod";

export const addressParamSchema = z.object({
  id: z.string().uuid("Invalid address ID format."),
});

export const createAddressSchema = z.object({
  recipientName: z
    .string({ required_error: "Recipient name is required." })
    .trim()
    .min(2, "Recipient name must be at least 2 characters.")
    .max(100, "Recipient name must not exceed 100 characters."),
  phone: z
    .string({ required_error: "Phone number is required." })
    .trim()
    .regex(/^[0-9+\s()-]{10,20}$/, "Please enter a valid phone number (10-20 digits)."),
  line1: z
    .string({ required_error: "Address line 1 is required." })
    .trim()
    .min(3, "Address line 1 must be at least 3 characters.")
    .max(150, "Address line 1 must not exceed 150 characters."),
  line2: z
    .string()
    .trim()
    .max(150, "Address line 2 must not exceed 150 characters.")
    .optional()
    .nullable(),
  city: z
    .string({ required_error: "City is required." })
    .trim()
    .min(2, "City must be at least 2 characters.")
    .max(80, "City must not exceed 80 characters."),
  state: z
    .string({ required_error: "State is required." })
    .trim()
    .min(2, "State must be at least 2 characters.")
    .max(80, "State must not exceed 80 characters."),
  postalCode: z
    .string({ required_error: "Postal code is required." })
    .trim()
    .min(3, "Postal code must be at least 3 characters.")
    .max(20, "Postal code must not exceed 20 characters."),
  country: z
    .string()
    .trim()
    .max(60)
    .default("India"),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();
