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
  // productIdParamSchema,
  productPublicIdParamSchema,
  updateProductSchema,
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
  "/deleted",
  verifyToken,
  authorize(ROLES.ADMIN),
  ProductController.getDeletedProducts
);


router.patch(
  // "/:id/restore",
  "/:publicId/restore",
  verifyToken,
  authorize(ROLES.ADMIN),
  // validateRequest(productIdParamSchema),
  validateRequest(productPublicIdParamSchema),
  ProductController.restoreProduct
);


router.get(
  // "/:id",
  "/:publicId",
  verifyToken,
  authorize(
    ROLES.ADMIN,
    ROLES.MODERATOR,
    ROLES.MANAGER,
    ROLES.SALES,
    ROLES.PURCHASE
  ),
  // validateRequest(productIdParamSchema),
  validateRequest(productPublicIdParamSchema),
  ProductController.getProductById
);

router.patch(
  // "/:id",
  "/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MANAGER), // Restricted to Admin/Manager per spec doc
  // validateRequest(productIdParamSchema),
  validateRequest(productPublicIdParamSchema),
  validateRequest(updateProductSchema),  // Validate Body criteria boundaries next
  ProductController.updateProduct
);

router.delete(
  // "/:id",
  "/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN), // Admin authorization lock enforced for structural safety
  // validateRequest(productIdParamSchema),
  validateRequest(productPublicIdParamSchema),
  ProductController.deleteProduct
);

export default router;
