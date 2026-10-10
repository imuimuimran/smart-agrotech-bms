// src/modules/settings/settings.validation.js
import { z } from "zod";

const businessLogoValidationSchema = z.object({
  url: z.string().url("Invalid business logo URL structure.").or(z.literal("")).optional(),
  publicId: z.string().trim().optional(),
}).strict(); // Enforce strict firewalls to reject unknown properties

const invoiceSettingsValidationSchema = z.object({
  prefix: z.string().trim().max(20, "Invoice prefix cannot exceed 20 characters.").optional(),
  footerText: z.string().trim().max(1000, "Footer text cannot exceed 1000 characters.").or(z.literal("")).optional(),
  showCompanyAddress: z.boolean().optional(),
  showCompanyPhone: z.boolean().optional(),
  showCompanyEmail: z.boolean().optional(),
}).strict();

const backupSettingsValidationSchema = z.object({
  enabled: z.boolean().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"], {
    errorMap: () => ({ message: "Backup frequency must be either 'daily', 'weekly', or 'monthly'." }),
  }).optional(),
  retentionDays: z.number().int().min(1, "Retention must be at least 1 day.").optional(),
}).strict();

const updateSettingsSchema = z.object({
  body: z.object({
    companyName: z.string().trim().max(200, "Company name cannot exceed 200 characters.").or(z.literal("")).optional(),
    companyEmail: z.string().email("Invalid company email format.").or(z.literal("")).optional(),
    companyPhone: z.string().trim().or(z.literal("")).optional(),
    companyAddress: z.string().trim().max(500, "Company address cannot exceed 500 characters.").or(z.literal("")).optional(),
    companyTaxNumber: z.string().trim().or(z.literal("")).optional(),
    businessLogo: businessLogoValidationSchema.optional(),
    invoiceSettings: invoiceSettingsValidationSchema.optional(),
    currency: z.string().trim().toUpperCase().length(3, "Currency must be an explicit 3-character ISO code.").optional(),
    timeZone: z.string().trim().min(1, "Time zone parameter field length cannot be empty.").optional(),
    backupSettings: backupSettingsValidationSchema.optional(),
  })
  .strict() // Block attempts to overwrite server-managed properties (updatedBy, publicId, timestamps)
  .refine(
    (body) => Object.keys(body).length > 0,
    { message: "At least one settings attribute must be provided for update." }
  ),
});

// Explicit named export standard alignment
export const SettingsValidation = {
  updateSettingsSchema,
};
