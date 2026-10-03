import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import validateRequest from "../../middlewares/validate.middleware.js";
import ROLES from "../../constants/roles.js";
import { ReportController } from "./report.controller.js";
import { ReportValidation } from "./report.validation.js";

const router = express.Router();

router.get(
  "/sales",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(ReportValidation.salesReportSchema),
  ReportController.getSalesReport
);

// Purchase Route - Mounted under ADMIN security parameters
router.get(
  "/purchases",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(ReportValidation.purchaseReportSchema),
  ReportController.getPurchaseReport
);

// Inventory Report Routing Structure
router.get(
  "/inventory/current",
  verifyToken,
  authorize(ROLES.ADMIN),
  ReportController.getCurrentStockReport
);

router.get(
  "/inventory/low-stock",
  verifyToken,
  authorize(ROLES.ADMIN),
  ReportController.getLowStockReport
);

router.get(
  "/inventory/out-of-stock",
  verifyToken,
  authorize(ROLES.ADMIN),
  ReportController.getOutOfStockReport
);

router.get(
  "/inventory/movement",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(ReportValidation.inventoryMovementReportSchema),
  ReportController.getInventoryMovementReport
);

// FIX: Convert default export to strict explicit named export
export const ReportRoutes = router;

