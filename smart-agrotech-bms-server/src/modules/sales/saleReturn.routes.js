import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import validateRequest from "../../middlewares/validate.middleware.js";
import ROLES from "../../constants/roles.js";
import { SaleReturnController } from "./saleReturn.controller.js";
import {
  createSaleReturnSchema,
  saleReturnWorkflowParamSchema,
  unifiedRejectSaleReturnSchema,
} from "./saleReturn.validation.js";

const router = express.Router();

/**
 * Create Sales Return Request (Initializes as DRAFT)
 * Permissions: Admin, Moderator
 */
router.post(
  "/returns",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  validateRequest(createSaleReturnSchema),
  SaleReturnController.createSaleReturn
);

/**
 * Submit Sales Return Request (DRAFT → PENDING_APPROVAL)
 * Permissions: Admin, Moderator
 */
router.post(
  "/returns/:publicId/submit",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  validateRequest(saleReturnWorkflowParamSchema),
  SaleReturnController.submitSaleReturn
);

/**
 * Approve Sales Return Request (PENDING_APPROVAL → APPROVED)
 * Permissions: Admin Only (Administrative Boundary)
 */
router.post(
  "/returns/:publicId/approve",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(saleReturnWorkflowParamSchema),
  SaleReturnController.approveSaleReturn
);

/**
 * Reject Sales Return Request (PENDING_APPROVAL → REJECTED)
 * Permissions: Admin Only
 * Fixed: Utilizes one single unified schema to comply with validateRequest constraints
 */
router.post(
  "/returns/:publicId/reject",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(unifiedRejectSaleReturnSchema),
  SaleReturnController.rejectSaleReturn
);

/**
 * Cancel Sales Return Request (DRAFT / PENDING_APPROVAL → CANCELLED)
 * Permissions: Admin, Moderator
 */
router.post(
  "/returns/:publicId/cancel",
  verifyToken,
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  validateRequest(saleReturnWorkflowParamSchema),
  SaleReturnController.cancelSaleReturn
);

export const saleReturnRoutes = router;
