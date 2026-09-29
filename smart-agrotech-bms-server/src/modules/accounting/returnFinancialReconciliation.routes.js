import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import ROLES from "../../constants/roles.js";
import { ReturnFinancialReconciliationController } from "./returnFinancialReconciliation.controller.js";

const router = express.Router();

/**
 * Post Customer Sales Return Financial Reconciliation
 * Permissions: Admin Only (Strict Ledger Isolation)
 */
router.post(
  "/reconcile/sales/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN),
  ReturnFinancialReconciliationController.reconcileCustomerReturn
);

/**
 * Post Supplier Purchase Return Financial Reconciliation
 * Permissions: Admin Only (Strict Ledger Isolation)
 */
router.post(
  "/reconcile/purchases/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN),
  ReturnFinancialReconciliationController.reconcileSupplierReturn
);

export const returnFinancialReconciliationRoutes = router;
