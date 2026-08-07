import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import validateRequest from "../../middlewares/validate.middleware.js";
import ROLES from "../../constants/roles.js";
import { BrandController } from "./brand.controller.js";
import { BrandValidation } from "./brand.validation.js";

const router = express.Router();

router.get(
  "/",
  verifyToken,
  authorize(
    ROLES.ADMIN,
    ROLES.MODERATOR,
    ROLES.MANAGER,
    ROLES.SALES,
    ROLES.PURCHASE
  ),
  BrandController.getBrands
);

router.get(
  "/:publicId",
  verifyToken,
  authorize(
    ROLES.ADMIN,
    ROLES.MODERATOR,
    ROLES.MANAGER,
    ROLES.SALES,
    ROLES.PURCHASE
  ),
  BrandController.getBrand
);

router.post(
  "/",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  validateRequest(BrandValidation.createBrandSchema),
  BrandController.createBrand
);

router.patch(
  "/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  validateRequest(BrandValidation.updateBrandSchema),
  BrandController.updateBrand
);

router.delete(
  "/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN),
  BrandController.deleteBrand
);

export default router;
