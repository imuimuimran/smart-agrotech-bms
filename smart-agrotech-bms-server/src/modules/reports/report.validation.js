import { z } from "zod";

const salesReportSchema = z.object({
  query: z.object({
    period: z
      .enum(["daily", "monthly", "yearly", "custom"])
      .default("daily"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// Purchase reports explicitly only allow daily, monthly, and yearly
const purchaseReportSchema = z.object({
  query: z.object({
    period: z.enum(["daily", "monthly", "yearly"]).default("daily"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

const inventoryMovementReportSchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

const expenseReportSchema = z.object({
  query: z.object({
    period: z.enum(["daily", "monthly", "yearly", "custom"]).default("daily"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

const revenueReportSchema = z.object({
  query: z.object({
    period: z.enum(["daily", "monthly", "yearly", "custom"]).default("daily"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

const profitLossReportSchema = z.object({
  query: z.object({
    period: z.enum(["daily", "monthly", "yearly", "custom"]).default("daily"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});


const customerDueReportSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    minDue: z.string().optional().transform((val) => (val ? Number(val) : undefined)),
    maxDue: z.string().optional().transform((val) => (val ? Number(val) : undefined)),
  }).refine((data) => {
    if (data.minDue !== undefined && data.maxDue !== undefined && data.maxDue < data.minDue) {
      return false;
    }
    return true;
  }, {
    message: "maxDue must be greater than or equal to minDue",
    path: ["maxDue"], // Attaches error footprint directly onto the maxDue response field
  }),
});


const supplierDueReportSchema = z.object({
  query: z.object({
    supplierId: z.string().optional(),
    search: z.string().trim().optional(),
    overdueOnly: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .optional()
      .transform((val) => val === true || val === "true"),
  }),
});

// Enforce project standard explicit named export
export const ReportValidation = {
  salesReportSchema,
  purchaseReportSchema,
  inventoryMovementReportSchema,
  expenseReportSchema,
  revenueReportSchema,
  profitLossReportSchema,
  customerDueReportSchema,
  supplierDueReportSchema,
};
