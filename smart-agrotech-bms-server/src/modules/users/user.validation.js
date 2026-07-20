import { z } from "zod";

export const updateUserSchema = z.object({
  params: z.object({
    publicId: z.string({
      required_error: "Public ID is required",
    }),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),

    phone: z.string().min(8).max(20).optional(),

    email: z.string().email().optional(),

    profileImage: z.string().url().optional(),
  }),
});