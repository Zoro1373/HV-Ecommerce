import { z } from "zod";
import { createAddressSchema } from "./address.validator.js";

export const orderParamSchema = z.object({
  id: z.string().trim().min(1, "Order identifier is required."),
});

export const createOrderSchema = z
  .object({
    addressId: z.string().uuid("Invalid address ID format.").optional().nullable(),
    shippingAddress: createAddressSchema.optional().nullable(),
    paymentMethod: z
      .string()
      .trim()
      .max(50)
      .default("COD"),
    notes: z
      .string()
      .trim()
      .max(500, "Notes must not exceed 500 characters.")
      .optional()
      .nullable(),
    idempotencyKey: z
      .string()
      .trim()
      .max(128, "Idempotency key must not exceed 128 characters.")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => Boolean(data.addressId || data.shippingAddress),
    {
      message: "A delivery address is required. Please provide either a saved addressId or a new shippingAddress.",
      path: ["addressId"],
    }
  );
