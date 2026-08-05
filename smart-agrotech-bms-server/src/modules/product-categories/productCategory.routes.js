import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js"
import authorize from "../../middlewares/authorize.middleware.js";
import validateRequest from "../../middlewares/validate.middleware.js";
// import { ROLES } from "../users/user.constants.js";
import ROLES from "../../constants/roles.js";
import { 
  createProductCategorySchema,
  updateProductCategorySchema, 
} from "./productCategory.validation.js";
import { ProductCategoryController } from "./productCategory.controller.js";

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
  ProductCategoryController.getProductCategories
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
  ProductCategoryController.getProductCategory
);

router.post(
  "/",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  validateRequest(createProductCategorySchema),
  ProductCategoryController.createProductCategory
);

router.patch(
  "/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  validateRequest(updateProductCategorySchema),
  ProductCategoryController.updateProductCategory
);

router.delete(
  "/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN),
  ProductCategoryController.deleteProductCategory
);

router.patch(
  "/:publicId/restore", 
  verifyToken, 
  authorize(ROLES.ADMIN), 
  ProductCategoryController.restoreProductCategory
);

export default router;
