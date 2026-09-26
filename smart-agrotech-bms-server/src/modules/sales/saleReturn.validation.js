import { z } from "zod";
import {
  SALE_RETURN_TYPE,
  SALE_RETURN_TYPE_LIST,
} from "./saleReturn.constants.js";

/**
 * ============================================================
 * REUSABLE VALIDATORS
 * ============================================================
 */
const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid MongoDB ObjectId."
  );

const positiveIntegerSchema = z
  .number()
  .int("Quantity must be an integer.")
  .min(1, "Quantity must be greater than zero.");

const moneySchema = z
  .number()
  .finite("Amount must be a finite number.")
  .min(0, "Amount cannot be negative.");

const nonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, "Value cannot be empty.");

/**
 * ============================================================
 * SALES RETURN ITEM
 * ============================================================
 */
export const saleReturnItemSchema = z.object({
  productId: objectIdSchema,
  productNameSnapshot: nonEmptyStringSchema,
  skuSnapshot: nonEmptyStringSchema,
  originalSaleItemId: objectIdSchema,
  soldQuantity: positiveIntegerSchema,
  returnQuantity: positiveIntegerSchema,
  unitPrice: moneySchema,
  unitCost: moneySchema,
  lineTotal: moneySchema,
  reason: nonEmptyStringSchema,
  batchNumber: z
    .string()
    .trim()
    .optional(),
  serialNumbers: z
    .array(z.string().trim().min(1))
    .optional()
    .default([]),
});

/**
 * ============================================================
 * EXCHANGE REPLACEMENT ITEM
 * ============================================================
 */
export const saleReplacementItemSchema = z.object({
  productId: objectIdSchema,
  productNameSnapshot: nonEmptyStringSchema,
  skuSnapshot: nonEmptyStringSchema,
  quantity: positiveIntegerSchema,
  unitPrice: moneySchema,
  unitCost: moneySchema,
  lineTotal: moneySchema,
  batchNumber: z
    .string()
    .trim()
    .optional(),
  serialNumbers: z
    .array(z.string().trim().min(1))
    .optional()
    .default([]),
});

/**
 * ============================================================
 * CREATE SALES RETURN / EXCHANGE
 * ============================================================
 */
export const createSaleReturnSchema = z
  .object({
    customerId: objectIdSchema,
    saleId: objectIdSchema,
    warehouseId: objectIdSchema,
    returnType: z.enum(SALE_RETURN_TYPE_LIST),
    items: z
      .array(saleReturnItemSchema)
      .min(1, "At least one returned item is required."),
    replacementItems: z
      .array(saleReplacementItemSchema)
      .default([]),
    reason: nonEmptyStringSchema,
    remarks: z
      .string()
      .trim()
      .optional(),
    totalQuantity: positiveIntegerSchema,
    totalAmount: moneySchema,
  })
  .superRefine((data, ctx) => {
    /**
     * RETURN / EXCHANGE STRUCTURAL RULE
     */
    if (
      data.returnType === SALE_RETURN_TYPE.RETURN &&
      data.replacementItems.length > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["replacementItems"],
        message: "Replacement items are not allowed for a RETURN.",
      });
    }

    if (
      data.returnType === SALE_RETURN_TYPE.EXCHANGE &&
      data.replacementItems.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["replacementItems"],
        message: "At least one replacement item is required for an EXCHANGE.",
      });
    }

    /**
     * DUPLICATE ORIGINAL SALE ITEM PROTECTION
     */
    const originalSaleItemIds = data.items.map(
      (item) => item.originalSaleItemId.toString()
    );
    const uniqueOriginalSaleItemIds = new Set(originalSaleItemIds);
    if (
      uniqueOriginalSaleItemIds.size !== originalSaleItemIds.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Duplicate original Sale items are not allowed. Combine quantities into one return line.",
      });
    }

    /**
     * RETURN QUANTITY AND LINE TOTAL STRUCTURAL CHECKS
     */
    data.items.forEach((item, index) => {
      if (item.returnQuantity > item.soldQuantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "returnQuantity"],
          message: "Return quantity cannot exceed the sold quantity.",
        });
      }

      const expectedLineTotal = Math.round(item.returnQuantity * item.unitPrice * 100) / 100;
      if (Math.abs(expectedLineTotal - item.lineTotal) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "lineTotal"],
          message: "Return item line total does not match return quantity and unit price.",
        });
      }
    });

    /**
     * TOTAL QUANTITY STRUCTURAL CHECK
     */
    const calculatedTotalQuantity = data.items.reduce(
      (sum, item) => sum + item.returnQuantity,
      0
    );
    if (calculatedTotalQuantity !== data.totalQuantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalQuantity"],
        message: "Total quantity must equal the sum of returned item quantities.",
      });
    }

    /**
     * TOTAL AMOUNT STRUCTURAL CHECK
     */
    const calculatedTotalAmount = Math.round(
      data.items.reduce((sum, item) => sum + item.lineTotal, 0) * 100
    ) / 100;
    if (Math.abs(calculatedTotalAmount - data.totalAmount) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalAmount"],
        message: "Total amount must equal the sum of returned item line totals.",
      });
    }
  });

/**
 * ============================================================
 * PUBLIC ID PARAMETER
 * ============================================================
 */
export const saleReturnPublicIdParamSchema = z.object({
  publicId: z
    .string()
    .trim()
    .min(1, "Sales return publicId is required."),
});

/**
 * ============================================================
 * REJECT / ACTION COMMENT
 * ============================================================
 */
export const rejectSaleReturnSchema = z.object({
  remarks: z
    .string()
    .trim()
    .min(3, "A rejection reason is required."),
});


/**
 * ============================================================
 * UNIFIED WORKFLOW SCHEMA CONTRACTS (Phase 13.x)
 * ============================================================
 * Wraps parameters to match the project's validateRequest structure cleanly.
 */

export const saleReturnWorkflowParamSchema = z.object({
  params: z.object({
    publicId: z.string().trim().min(1, "Sales return publicId parameter is required."),
  }),
});

export const unifiedRejectSaleReturnSchema = z.object({
  params: z.object({
    publicId: z.string().trim().min(1, "Sales return publicId parameter is required."),
  }),
  body: z.object({
    remarks: z.string().trim().min(3, "A detailed rejection reason remarks context is required."),
  }),
});
