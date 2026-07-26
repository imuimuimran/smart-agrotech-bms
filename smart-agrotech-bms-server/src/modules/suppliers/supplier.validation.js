import { z } from "zod";
import { addressSchema } from "../../shared/validations/address.validation.js";
import {
  SUPPLIER_TYPES,
  SUPPLIER_STATUS,
  PAYMENT_TERMS,
} from "./supplier.constants.js";

const contactPersonSchema = z.object({
  name: z.string().min(1, "Contact person name is required"),
  designation: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid contact person email format").optional().or(z.literal("")),
});

const bankAccountSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  routingNumber: z.string().optional(),
  branchName: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const createSupplierSchema = z.object({
  body: z.object({
    supplierName: z.string().min(2, "Supplier name must be at least 2 characters long"),
    supplierCode: z.string().optional(),
    companyName: z.string().optional(),
    supplierType: z.enum(Object.values(SUPPLIER_TYPES), {
      errorMap: () => ({ message: "Invalid supplier type option provided" }),
    }),
    contactPerson: contactPersonSchema,
    email: z.string().email("Invalid email format").optional().or(z.literal("")),
    phone: z.string().min(6, "Phone number must be at least 6 characters long"),
    alternatePhone: z.string().optional(),
    website: z.string().url("Invalid website URL format").optional().or(z.literal("")),
    tradeLicenseNumber: z.string().optional(),
    taxIdentificationNumber: z.string().optional(),
    paymentTerms: z.enum(Object.values(PAYMENT_TERMS), {
      errorMap: () => ({ message: "Invalid payment terms option provided" }),
    }),
    creditLimit: z.number().min(0, "Credit limit cannot be negative").optional(),
    currency: z.string().optional(),
    bankAccounts: z
      .array(bankAccountSchema)
      .default([])
      .refine(
        (accounts) => accounts.filter((account) => account.isDefault).length <= 1,
        { message: "Only one default bank account is allowed." }
      ),
    address: addressSchema,
    notes: z.string().optional(),
    status: z.enum(Object.values(SUPPLIER_STATUS)).optional(),
  }),
});

export const updateSupplierSchema = z.object({
  body: createSupplierSchema.shape.body.partial(),
});
