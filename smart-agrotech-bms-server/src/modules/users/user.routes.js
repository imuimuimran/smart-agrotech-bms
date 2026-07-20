import { Router } from "express";

import verifyToken from "../../middlewares/auth.middleware.js";

import authorize from "../../middlewares/authorize.middleware.js";

import ROLES from "../../constants/roles.js";

import { UserController } from "./user.controller.js";

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

export default router;