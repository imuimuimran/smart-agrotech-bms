import { Router } from "express";

import validate from "../../middlewares/validate.middleware.js";

import verifyToken from "../../middlewares/auth.middleware.js";

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
 * Current User
 * (Protected later)
 */
router.get(
  "/me",
  verifyToken,
  AuthController.me
);

export default router;