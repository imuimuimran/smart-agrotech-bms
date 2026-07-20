import { z } from "zod";
import ROLES from "../../constants/roles.js";

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

// export const updateUserRoleSchema = z.object({
//   body: z.object({
//     role: z.enum([
//       ROLES.ADMIN,
//       ROLES.MODERATOR,
//     ]),
//   }),
// });

export const updateUserRoleSchema = z.object({
  // 1. You must include this params block so Express doesn't lose the publicId!
  params: z.object({
    publicId: z.string({
      required_error: "Public ID is required",
    }),
  }),
  // 2. The body block for updating the role
  body: z.object({
    role: z.enum(Object.values(ROLES)),
  }),
});