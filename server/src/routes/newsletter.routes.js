import { Router } from "express";
import * as newsletterController from "../controllers/newsletter.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { newsletterLimiter } from "../middleware/rateLimit.middleware.js";
import { subscribeNewsletterSchema } from "../validators/newsletter.validator.js";

export const newsletterRouter = Router();

/**
 * POST /api/newsletter/subscribe
 * Public endpoint to subscribe an email to the VERTEX newsletter.
 * Validates, normalizes, and idempotently registers the subscriber.
 */
newsletterRouter.post(
  "/subscribe",
  newsletterLimiter,
  validateBody(subscribeNewsletterSchema),
  newsletterController.subscribe
);
