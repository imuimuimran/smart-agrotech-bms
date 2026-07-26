import { z } from "zod";
import { addressSchema } from "../../shared/validations/address.validation.js";

// Contact Person Validation
const contactPersonSchema = z.object({
  name: z.string().min(1, "Contact person name is required"),
  designation: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid contact person email format").optional().or(z.literal("")),
});

// Bank Account Validation Base
const bankAccountSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  routingNumber: z.string().optional(),
  branchName: z.string().optional(),
  isDefault: z.boolean().default(false),
});

// Create Supplier Schema Structure
export const createSupplierSchema = z.object({
  body: z.object({
    supplierName: z.string().min(2, "Supplier name must be at least 2 characters long"),
    supplierCode: z.string().optional(),
    companyName: z.string().optional(),
    supplierType: z.string({ required_error: "Supplier type is required" }),
    contactPerson: contactPersonSchema,
    email: z.string().email("Invalid email format").optional().or(z.literal("")),
    phone: z.string().min(6, "Phone number must be at least 6 characters long"),
    alternatePhone: z.string().optional(),
    website: z.string().url("Invalid website URL format").optional().or(z.literal("")),
    tradeLicenseNumber: z.string().optional(),
    taxIdentificationNumber: z.string().optional(),
    paymentTerms: z.string({ required_error: "Payment terms are required" }),
    creditLimit: z.number().min(0, "Credit limit cannot be negative").optional(),
    currency: z.string().optional(),
    
    // Business Rule 1 — Only One Default Bank Account Validation Refinement
    bankAccounts: z
      .array(bankAccountSchema)
      .default([])
      .refine(
        (accounts) => {
          const defaults = accounts.filter((account) => account.isDefault);
          return defaults.length <= 1;
        },
        {
          message: "Only one default bank account is allowed.",
          path: [], // Sets the error context focus to the root array field
        }
      ),

    address: addressSchema,
    notes: z.string().optional(),
    status: z.string().optional(),
  }),
});

// Update Supplier Schema (Auto-Partial Processing Layer)
export const updateSupplierSchema = z.object({
  body: createSupplierSchema.shape.body.partial(),
});
