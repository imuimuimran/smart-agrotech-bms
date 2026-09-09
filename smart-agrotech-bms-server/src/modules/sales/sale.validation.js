import { z } from "zod";
import {
  PAYMENT_METHOD_LIST,
  SALE_STATUS_LIST,
} from "./sale.constants.js";

/**
 * Reusable MongoDB ObjectId validation.
 */
const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid MongoDB ObjectId."
  );

/**
 * Reusable monetary value validation.
 *
 * Money cannot be negative.
 */
const positiveMoney = z
  .number()
  .finite()
  .min(0, "Monetary calculations cannot hold negative values.");


const moneySchema = z
  .number()
  .finite("Amount must be a valid number.")
  .min(0, "Amount cannot be negative.");

/**
 * Sale quantity.
 *
 * Sales cannot contain zero or negative quantities.
 */
const saleQuantitySchema = z
  .number()
  .int("Quantity must be a whole integer.")
  .min(1, "Quantity must be greater than zero.");

/**
 * Individual sale item.
 *
 * Only transaction input is accepted here.
 * Historical productName and sku should be resolved
 * from the Product record by the service layer.
 */
const saleItemSchema = z.object({
  productId: objectIdSchema,
  quantity: saleQuantitySchema,
  unitPrice: moneySchema,
  discount: moneySchema
    .optional()
    .default(0),
});


const saleItemInputSchema = z.object({
  productId: objectIdSchema,
  quantity: z
    .number()
    .int("Item breakdown tracking counts must be whole integers.")
    .min(1, "Purchased entity items count must be at least 1."),
  unitPrice: positiveMoney,
  discountAmount: positiveMoney.optional().default(0),
  taxAmount: positiveMoney.optional().default(0),
});

/**
 * Create Sale
 *
 * The client provides the commercial input.
 * The service calculates:
 * - subtotal
 * - discount
 * - totalAmount
 * - paidAmount
 * - dueAmount
 */
export const createSaleSchema = z
  .object({
    customerId: objectIdSchema,
    products: z
      .array(saleItemSchema)
      .min(
        1,
        "A sale must contain at least one product."
      ),
    discount: moneySchema
      .optional()
      .default(0),
    paidAmount: moneySchema
      .optional()
      .default(0),
    saleDate: z
      .preprocess(
        (value) => {
          if (!value) return undefined;
          const date = new Date(value);
          return Number.isNaN(date.getTime())
            ? value
            : date;
        },
        z.date().optional()
      ),
    remarks: z
      .string()
      .trim()
      .max(
        1000,
        "Remarks cannot exceed 1000 characters."
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    /**
     * Prevent duplicate product lines.
     */
    const productIds = data.products.map(
      (item) => item.productId
    );
    const uniqueProductIds = new Set(productIds);
    if (
      uniqueProductIds.size !== productIds.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "The same product cannot appear multiple times in one sale.",
        path: ["products"],
      });
    }

    /**
     * Calculate line-level discount checks before authoritative calculation.
     */
    let subtotal = 0;
    for (const item of data.products) {
      const lineSubtotal =
        item.quantity * item.unitPrice;
      if (item.discount > lineSubtotal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Line discount cannot exceed the line subtotal.",
          path: ["products"],
        });
      }
      subtotal += lineSubtotal;
    }

    /**
     * Sale-level discount cannot exceed subtotal.
     */
    if (data.discount > subtotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Sale discount cannot exceed the sale subtotal.",
        path: ["discount"],
      });
    }
  });

/**
 * Update Sale
 */
export const updateSaleSchema = z
  .object({
    remarks: z
      .string()
      .trim()
      .max(
        1000,
        "Remarks cannot exceed 1000 characters."
      )
      .optional(),
    status: z
      .enum(SALE_STATUS_LIST)
      .optional(),
  })
  .strict();

/**
 * Record Customer Payment
 */
export const recordSalePaymentSchema = z
  .object({
    amount: z
      .number()
      .finite("Payment amount must be a valid number.")
      .positive(
        "Payment amount must be greater than zero."
      ),
    paymentMethod: z.enum(
      PAYMENT_METHOD_LIST,
      {
        errorMap: () => ({
          message:
            "Invalid payment method.",
        }),
      }
    ),
    reference: z
      .string()
      .trim()
      .max(
        200,
        "Payment reference cannot exceed 200 characters."
      )
      .optional(),
    comment: z
      .string()
      .trim()
      .max(
        1000,
        "Payment comment cannot exceed 1000 characters."
      )
      .optional(),
  })
  .strict();

/**
 * Sale publicId parameter validation.
 */
export const salePublicIdParamSchema = z.object({
  publicId: z
    .string()
    .trim()
    .min(
      1,
      "Sale public ID is required."
    ),
});

export const createSaleValidationSchema = z
  .object({
    customerId: objectIdSchema,
    warehouseId: objectIdSchema,
    saleDate: z
      .preprocess(
        (val) => (val ? new Date(val) : new Date()),
        z.date()
      )
      .optional(),
    items: z
      .array(saleItemInputSchema)
      .min(1, "An invoice breakdown require at least 1 product row entry."),
    discountAmount: positiveMoney.optional().default(0),
    taxAmount: positiveMoney.optional().default(0),
    shippingCost: positiveMoney.optional().default(0),
    paidAmount: positiveMoney.optional().default(0),
    notes: z.string().trim().max(1000).optional().default(""),
  })
  .superRefine((data, ctx) => {
    // Prevent duplicate lines of identical products inside one transaction payload
    const activeMappingRows = data.items.map((item) => item.productId.toString());
    const filterDuplicates = new Set(activeMappingRows);
    
    if (filterDuplicates.size !== activeMappingRows.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate product line rows detected. Combine item metrics into a flat configuration.",
        path: ["items"],
      });
    }
  });

export const updateSaleNotesValidationSchema = z.object({
  notes: z.string().trim().max(1000).min(1, "Notes placeholder context string cannot be empty."),
});