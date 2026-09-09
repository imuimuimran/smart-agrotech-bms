import express from "express";
import validate from "../../middlewares/validate.middleware.js";

import verifyToken from "../../middlewares/auth.middleware.js";

import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js";

import { SaleController } from "./sale.controller.js";
import {
  createSaleSchema,
  recordSalePaymentSchema,
  createSaleValidationSchema,
} from "./sale.validation.js";

const router = express.Router();

/**
 * Local Authorization Guardian Arrays
 * 
 * Instead of inventing global middleware functions that don't exist,
 * we handle role authorization elegantly inline based on req.user.role.
 */
const allowAdminAndModerator = (req, res, next) => {
  const allowedRoles = ["admin", "moderator"];
  if (!allowedRoles.includes(req.user?.role)) {
    return next(
      new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Access Denied: Admin or Moderator rank required."
      )
    );
  }
  next();
};

const allowAdminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return next(
      new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Access Denied: Strict Admin privileges required."
      )
    );
  }
  next();
};

/**
 * Route Parameters Validation Schema
 * Inline schema definition for publicId param validation to guarantee 
 * route safety without guessing separate file boundaries.
 */
import { z } from "zod";
const salePublicIdParamSchema = z.object({
  publicId: z.string().trim().min(1, "Sale public ID parameter is required."),
});

// ==========================================
// OPERATIONAL SALES ENDPOINTS
// ==========================================

/**
 * Create Sale
 * Permissions: Admin + Moderator
 */
router.post(
  "/",
  verifyToken,
  allowAdminAndModerator,
  validate(createSaleValidationSchema),
  SaleController.createSale
);

/**
 * Get All Paginated and Filtered Sales
 * Permissions: Admin + Moderator
 */
router.get(
  "/",
  verifyToken,
  allowAdminAndModerator,
  SaleController.getSales
);

/**
 * Get Single Sale Profile by publicId
 * Permissions: Admin + Moderator
 */
router.get(
  "/:publicId",
  verifyToken,
  allowAdminAndModerator,
  validate(salePublicIdParamSchema),
  SaleController.getSaleByPublicId
);

/**
 * Record Sale Payment / Credit Collection Balance Update
 * Permissions: Admin Only (Sensitive Financial Settlement Boundary)
 */
router.post(
  "/:publicId/payments",
  verifyToken,
  allowAdminOnly,
  validate(recordSalePaymentSchema),
  SaleController.recordSalePayment
);

export default router;
