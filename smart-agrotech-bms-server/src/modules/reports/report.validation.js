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

// Enforce project standard explicit named export
export const ReportValidation = {
  salesReportSchema,
};
