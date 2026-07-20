import { Router } from "express";

import verifyToken from "../../middlewares/auth.middleware.js";

import authorize from "../../middlewares/authorize.middleware.js";

import ROLES from "../../constants/roles.js";

import validateRequest from "../../middlewares/validate.middleware.js";

import { UserController } from "./user.controller.js";

import { updateUserSchema } from "./user.validation.js";

const router = Router();

router.get(
  "/",
  verifyToken,
  authorize(ROLES.ADMIN),
  UserController.getUsers
);

router.get(
  "/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN),
  UserController.getUser
);

router.patch(
  "/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(updateUserSchema),
  UserController.updateUser
);

export default router;