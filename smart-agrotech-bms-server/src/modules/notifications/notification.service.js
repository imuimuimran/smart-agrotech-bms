import mongoose from "mongoose";
import QueryBuilder from "../../builder/QueryBuilder.js";
import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import { Notification } from "./notification.model.js"; // FIX: Enforce strict explicit named import hook
import { NOTIFICATION_MESSAGES } from "./notification.constants.js";

/**
 * Retrieves unread/read alert messages belonging strictly to the authenticated user.
 * Implements full search (title, message), sort, select fields, and pagination behaviors via QueryBuilder.
 */
const getNotifications = async (query = {}, reqUser) => {
  if (!reqUser?.id) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Authenticated user identity is required."
    );
  }

  // Core project boundary firewall rule: enforce isDeleted filter and user ownership scoping
  const baseQueryConditions = {
    userId: reqUser.id,
    isDeleted: false,
  };

  const notificationQuery = new QueryBuilder(
    Notification.find(baseQueryConditions),
    query
  )
    .search(["title", "message"])
    .sort()
    .paginate()
    .fields();

  const data = await notificationQuery.modelQuery;
  const meta = await notificationQuery.countTotal();

  return {
    meta,
    data,
  };
};

/**
 * Marks a single specific target alert notification as read.
 * 
 * Multi-Tenant Security Guard:
 * The query requires both notificationId AND reqUser.id matching parameter properties 
 * to completely eliminate cross-user unauthorized data pollution exploits.
 */
const markNotificationAsRead = async (notificationId, reqUser) => {
  if (!reqUser?.id) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Authenticated user identity is required."
    );
  }

  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Invalid notification ID."
    );
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      userId: reqUser.id,
      isDeleted: false, // Soft-delete firewall check
    },
    {
      $set: {
        isRead: true,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!notification) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      NOTIFICATION_MESSAGES.NOT_FOUND
    );
  }

  return notification;
};

/**
 * Marks all active unread notification logs owned by the authenticated actor as read.
 */
const markAllNotificationsAsRead = async (reqUser) => {
  if (!reqUser?.id) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Authenticated user identity is required."
    );
  }

  const result = await Notification.updateMany(
    {
      userId: reqUser.id,
      isRead: false,
      isDeleted: false, // Soft-delete firewall check
    },
    {
      $set: {
        isRead: true,
      },
    }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
};

export const NotificationService = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
