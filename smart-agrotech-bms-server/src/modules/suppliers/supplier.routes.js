import { Router } from "express";
import { SupplierController } from "./supplier.controller.js";
import validateRequest from "../../middlewares/validate.middleware.js";
import { createSupplierSchema, updateSupplierSchema, } from "./supplier.validation.js";
import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import ROLES from "../../constants/roles.js";

const router = Router();

// 1. Collection Operations
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

// 2. Static Endpoints (Must be placed before dynamic parameters)
router.get(

  "/statistics/overview",

  verifyToken,

  authorize(
    ROLES.ADMIN,
    ROLES.MODERATOR,
    ROLES.PURCHASE
  ),

  SupplierController
    .getSupplierStatistics

);

router.get(
  "/dashboard/summary",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR, ROLES.PURCHASE),
  SupplierController.getSupplierDashboardSummary
);

// 3. Dynamic Parameter Endpoints 
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

router.delete(

  "/:publicId",

  verifyToken,

  authorize(
    ROLES.ADMIN
  ),

  SupplierController
    .deleteSupplier

);

export const SupplierRoutes = router;
