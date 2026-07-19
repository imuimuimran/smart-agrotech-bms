import { Router } from "express";

import validate from "../../middlewares/validate.middleware.js";

import verifyToken from "../../middlewares/auth.middleware.js";

import authorize from "../../middlewares/authorize.middleware.js";
import ROLES from "../../constants/roles.js";

import { AuthController } from "./auth.controller.js";

import {
  registerSchema,
  loginSchema,
} from "./auth.validation.js";

const router = Router();

/**
 * Register
 */
router.post(
  "/register",
  validate(registerSchema),
  AuthController.register
);

/**
 * Login
 */
router.post(
  "/login",
  validate(loginSchema),
  AuthController.login
);


/**
 * Logout
 */
router.post(
    "/logout",

    AuthController.logout
);

/**
 * Current User
 * (Protected later)
 */
router.get(
  "/admin-test",
  verifyToken,
  authorize(ROLES.ADMIN),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin!",
      data: req.user,
    });
  }
);


router.get(
  "/me",
  verifyToken,
  AuthController.me
);

export default router;