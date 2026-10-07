import mongoose from "mongoose";
import { NOTIFICATION_TYPES } from "./notification.constants.js";

const notificationSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * ============================================================
 * HIGH-PERFORMANCE DATABASE INDEX PATTERNS
 * ============================================================
 * Optimized for user-specific streams filtering read/unread status sorted chronologically.
 */
notificationSchema.index({
  userId: 1,
  isRead: 1,
  createdAt: -1,
});

notificationSchema.index({
  userId: 1,
  createdAt: -1,
});

// Refactored to explicit named export pattern to match system architecture contracts
export const Notification = mongoose.model(
  "Notification",
  notificationSchema,
  "notifications"
);
