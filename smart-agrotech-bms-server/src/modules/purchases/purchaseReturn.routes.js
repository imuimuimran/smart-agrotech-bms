import express from "express";
import validateRequest from "../../middlewares/validate.middleware.js";
import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import ROLES from "../../constants/roles.js";
import { PurchaseReturnController } from "./purchaseReturn.controller.js";
import { createPurchaseReturnSchema } from "./purchaseReturn.validation.js";
import {
  purchaseReturnPublicIdParamSchema,
  rejectPurchaseReturnSchema,
} from "./purchaseReturn.validation.js";

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

/**
 * Submit for Approval (DRAFT → PENDING_APPROVAL)
 * Permissions: Admin, Moderator
 */
router.post(
  "/returns/:publicId/submit",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  validateRequest(purchaseReturnPublicIdParamSchema),
  PurchaseReturnController.submitPurchaseReturn
);

/**
 * Approve Return Request (PENDING_APPROVAL → APPROVED)
 * Permissions: Admin Only (Sensitive Business Discretion Isolation)
 */
router.post(
  "/returns/:publicId/approve",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(purchaseReturnPublicIdParamSchema),
  PurchaseReturnController.approvePurchaseReturn
);

/**
 * Reject Return Request (PENDING_APPROVAL → REJECTED)
 * Permissions: Admin Only
 */
router.post(
  "/returns/:publicId/reject",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(rejectPurchaseReturnSchema),
  PurchaseReturnController.rejectPurchaseReturn
);

/**
 * Cancel Return Request (DRAFT / PENDING_APPROVAL → CANCELLED)
 * Permissions: Admin, Moderator
 */
router.post(
  "/returns/:publicId/cancel",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  validateRequest(purchaseReturnPublicIdParamSchema),
  PurchaseReturnController.cancelPurchaseReturn
);

// /**
//  * Execute Physical Stock Movements (PROCESSING → COMPLETED)
//  * Permissions: Admin Only (Strict Inventory Ledger Isolation Boundary)
//  */
// router.post(
//   "/returns/:publicId/process",
//   verifyToken,
//   authorize(ROLES.ADMIN),
//   validateRequest(purchaseReturnPublicIdParamSchema),
//   PurchaseReturnController.processPurchaseReturn
// );

export const purchaseReturnRoutes = router;
