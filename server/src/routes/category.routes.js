import { Router } from "express";
import * as categoryController from "../controllers/category.controller.js";
import { validateParams } from "../middleware/validate.middleware.js";
import { categoryParamSchema } from "../validators/catalog.validator.js";

export const categoryRouter = Router();

// List all active categories
categoryRouter.get("/", categoryController.listCategories);

// Retrieve active category by slug
categoryRouter.get(
  "/:slug",
  validateParams(categoryParamSchema),
  categoryController.getCategory
);
