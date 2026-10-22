import { Router } from "express";
import * as quoteController from "../controllers/quote.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { quoteLimiter } from "../middleware/rateLimit.middleware.js";
import { createQuoteSchema } from "../validators/quote.validator.js";

export const quoteRouter = Router();

/**
 * POST /api/quotes
 * Public and customer-accessible endpoint to submit a Request for Quote (RFQ).
 * Automatically associates authenticated user session if logged in.
 */
quoteRouter.post(
  "/",
  quoteLimiter,
  optionalAuth,
  validateBody(createQuoteSchema),
  quoteController.submitQuote
);
