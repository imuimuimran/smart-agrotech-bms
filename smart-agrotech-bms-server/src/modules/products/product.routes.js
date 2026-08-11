import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import validateRequest from "../../middlewares/validate.middleware.js";
import validateQuery from "../../middlewares/validate.middleware.js";
import ROLES from "../../constants/roles.js";
import { ProductController } from "./product.controller.js";
import { 
  createProductSchema,
  productListQuerySchema,
  productIdParamSchema,   
} from "./product.validation.js";

const router = express.Router();

router.post(
  "/",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR, ROLES.MANAGER),
  validateRequest(createProductSchema),
  ProductController.createProduct
);

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
  validateQuery(productListQuerySchema),
  ProductController.getProducts
);

router.get(
  "/:id",
  verifyToken,
  authorize(
    ROLES.ADMIN,
    ROLES.MODERATOR,
    ROLES.MANAGER,
    ROLES.SALES,
    ROLES.PURCHASE
  ),
  validateRequest(productIdParamSchema), // Validates format layout properties cleanly
  ProductController.getProductById
);

export default router;
