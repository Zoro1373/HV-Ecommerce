import { Router } from "express";
import * as addressController from "../controllers/address.controller.js";
import { authenticateSession } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import {
  createAddressSchema,
  updateAddressSchema,
  addressParamSchema,
} from "../validators/address.validator.js";

export const addressRouter = Router();

// All address endpoints require user authentication & CSRF validation on state changes
addressRouter.use(authenticateSession);

addressRouter.get("/", addressController.listAddresses);
addressRouter.get("/:id", validateParams(addressParamSchema), addressController.getAddress);
addressRouter.post("/", validateBody(createAddressSchema), addressController.createAddress);
addressRouter.patch(
  "/:id",
  validateParams(addressParamSchema),
  validateBody(updateAddressSchema),
  addressController.updateAddress
);
addressRouter.delete("/:id", validateParams(addressParamSchema), addressController.deleteAddress);
