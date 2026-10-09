import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import { NotificationController } from "./notification.controller.js";

const router = express.Router();

/**
 * ============================================================
 * NOTIFICATION USER ALERTS SYSTEM ROUTES
 * ============================================================
 * Enforces authenticated actor context parameters uniformly across endpoints.
 */

// 1. Fetch user-owned notifications (paginated/filtered)
router.get(
  "/",
  verifyToken,
  NotificationController.getNotifications
);

// 2. FIX: Place the static endpoint first to prevent parametric route collision bugs
router.patch(
  "/read-all",
  verifyToken,
  NotificationController.markAllNotificationsAsRead
);

// 3. Mark a specific targeted item as read by its unique Object ID parameters
router.patch(
  "/:id/read",
  verifyToken,
  NotificationController.markNotificationAsRead
);

// Convert default export to strict explicit named export to preserve project consistency
export const NotificationRoutes = router;
