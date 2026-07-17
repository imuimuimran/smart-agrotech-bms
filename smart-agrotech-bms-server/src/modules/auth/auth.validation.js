import { z } from "zod";

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters.")
  .max(100, "Password cannot exceed 100 characters.");

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(100, "Name cannot exceed 100 characters."),

    email: z
      .string()
      .trim()
      .email("Please provide a valid email address."),

    phone: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),

    password: passwordSchema,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address."),

    password: passwordSchema,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address."),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required."),
    password: passwordSchema,
  }),
});