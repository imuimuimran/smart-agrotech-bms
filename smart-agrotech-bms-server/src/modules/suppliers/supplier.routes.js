import { Router } from "express";
import { SupplierController } from "./supplier.controller.js";
import validateRequest from "../../middlewares/validate.middleware.js"; 
import { createSupplierSchema, updateSupplierSchema, } from "./supplier.validation.js";
import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import ROLES from "../../constants/roles.js";

const router = Router();

router.post(
  "/",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR, ROLES.PURCHASE),
  validateRequest(createSupplierSchema),
  SupplierController.createSupplier
);

router.get(
  "/",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR, ROLES.PURCHASE),
  SupplierController.getSuppliers
);

// "/statistics/..." router placed here

router.get(
  "/:publicId",

  verifyToken,

  authorize(
    ROLES.ADMIN,
    ROLES.MODERATOR,
    ROLES.PURCHASE
  ),

  SupplierController.getSupplier
);

router.patch(

  "/:publicId",

  verifyToken,

  authorize(
    ROLES.ADMIN,
    ROLES.MODERATOR
  ),

  validateRequest(
    updateSupplierSchema
  ),

  SupplierController
    .updateSupplier

);

export const SupplierRoutes = router;
