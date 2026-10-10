import { Router } from "express";
import verifyToken from "../../middlewares/auth.middleware.js"; 
import authorize from "../../middlewares/authorize.middleware.js";
import validateRequest from "../../middlewares/validate.middleware.js";
import ROLES from "../../constants/roles.js";
import { SettingsController } from "./settings.controller.js";
import { SettingsValidation } from "./settings.validation.js";

const router = Router();

/**
 * ============================================================
 * GLOBAL SYSTEM CONFIGURATION MATRIX ROUTES
 * ============================================================
 * Complete lockdown enforcement: Admin-only entry points.
 */

// Retrieve system settings — administrator only.
router.get(
  "/",
  verifyToken,
  authorize(ROLES.ADMIN),
  SettingsController.getSettings
);

// Update system settings — administrator only.
router.patch(
  "/",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(SettingsValidation.updateSettingsSchema), // FIX: Aligned to our actual Zod schema property contract name
  SettingsController.updateSettings
);

// FIX: Convert default export to strict explicit named export to satisfy project constraints
export const SettingsRoutes = router;
