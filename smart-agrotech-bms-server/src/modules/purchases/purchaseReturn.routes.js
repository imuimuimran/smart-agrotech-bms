import express from "express";
import validateRequest from "../../middlewares/validate.middleware.js";
import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import ROLES from "../../constants/roles.js";
import { PurchaseReturnController } from "./purchaseReturn.controller.js";
import { createPurchaseReturnSchema } from "./purchaseReturn.validation.js";

const router = express.Router();

/**
 * Create a new Purchase Return or Exchange Request
 * Route: POST /api/v1/purchases/returns
 * Permissions: Admin, Moderator
 */
router.post(
  "/returns",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  validateRequest(createPurchaseReturnSchema),
  PurchaseReturnController.createPurchaseReturn
);

export const purchaseReturnRoutes = router;
