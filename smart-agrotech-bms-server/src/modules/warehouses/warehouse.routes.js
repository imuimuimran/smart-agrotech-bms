import { Router } from "express";

import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import validateRequest from "../../middlewares/validate.middleware.js";

import ROLES from "../../constants/roles.js";

import { WarehouseController } from "./warehouse.controller.js";
import { createWarehouseSchema, getWarehousesQuerySchema } from "./warehouse.validation.js";

const router = Router();

router.post(
  "/",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  validateRequest(createWarehouseSchema),
  WarehouseController.createWarehouse
);

/**
 * Get active warehouses.
 *
 * Permissions:
 * Admin, Moderator, Sales
 */
router.get(
  "/",
  verifyToken,
  authorize(
    ROLES.ADMIN,
    ROLES.MODERATOR,
    ROLES.SALES
  ),
  validateRequest(getWarehousesQuerySchema),
  WarehouseController.getWarehouses
);

export const warehouseRoutes = router;