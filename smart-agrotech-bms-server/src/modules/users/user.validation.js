import { z } from "zod";
import ROLES from "../../constants/roles.js";
import USER_STATUS from "../../constants/userStatus.js";

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
  })
  .strict(),
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
  params: z.object({
    publicId: z.string({
      required_error: "Public ID is required",
    }),
  }),

  body: z.object({
    role: z.enum(Object.values(ROLES)),
  })
  .strict(),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    publicId: z.string({
      required_error: "Public ID is required",
    }),
  }),
  
  body: z.object({
    status: z.enum([
      USER_STATUS.ACTIVE,
      USER_STATUS.INACTIVE,
    ]),
  })
  .strict(),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),

    phone: z.string().min(8).max(20).optional(),

    profileImage: z
      .string()
      .url()
      .optional(),
  })
  .strict(),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string()
        .min(8),

      newPassword: z
        .string()
        .min(8)
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
          "Password must contain uppercase, lowercase, number and special character."
        ),

      confirmPassword: z
        .string()
        .min(8),
    })
    .refine(
      (data) =>
        data.newPassword ===
        data.confirmPassword,
      {
        message:
          "Passwords do not match.",
        path: ["confirmPassword"],
      }
    ),
});