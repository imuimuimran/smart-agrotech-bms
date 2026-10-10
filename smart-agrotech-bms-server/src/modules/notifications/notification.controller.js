// import catchAsync from "../../shared/catchAsync.js";
// import sendResponse from "../../shared/sendResponse.js"
// import HTTP_STATUS from "../../constants/httpStatus.js";
// import { NotificationService } from "./notification.service.js";
// import { NOTIFICATION_MESSAGES } from "./notification.constants.js";

// /**
//  * Fetches user-specific notifications matching QueryBuilder parameters.
//  */
// const getNotifications = catchAsync(async (req, res) => {
//   const result = await NotificationService.getNotifications(
//     req.query,
//     req.user
//   );

//   sendResponse(res, {
//     statusCode: HTTP_STATUS.OK,
//     success: true,
//     message: NOTIFICATION_MESSAGES.RETRIEVED,
//     data: result.data,
//     meta: result.meta,
//   });
// });

// /**
//  * Marks a distinct targeted user notification as read.
//  */
// const markNotificationAsRead = catchAsync(async (req, res) => {
//   const result = await NotificationService.markNotificationAsRead(
//     req.params.id,
//     req.user
//   );

//   sendResponse(res, {
//     statusCode: HTTP_STATUS.OK,
//     success: true,
//     message: NOTIFICATION_MESSAGES.MARKED_AS_READ,
//     data: result,
//   });
// });

// /**
//  * Marks all pending unread notifications for the active user as read.
//  */
// const markAllNotificationsAsRead = catchAsync(async (req, res) => {
//   const result = await NotificationService.markAllNotificationsAsRead(
//     req.user
//   );

//   sendResponse(res, {
//     statusCode: HTTP_STATUS.OK,
//     success: true,
//     message: NOTIFICATION_MESSAGES.ALL_MARKED_AS_READ,
//     data: result,
//   });
// });

// export const NotificationController = {
//   getNotifications,
//   markNotificationAsRead,
//   markAllNotificationsAsRead,
// };



import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js"
import HTTP_STATUS from "../../constants/httpStatus.js";
import { NotificationService } from "./notification.service.js";
import { NOTIFICATION_MESSAGES } from "./notification.constants.js";

/**
 * Fetches user-specific notifications matching QueryBuilder parameters.
 */
const getNotifications = catchAsync(async (req, res) => {
  const result = await NotificationService.getNotifications(
    req.query,
    req.user
  );

  // FIXED: res is now inside the object
  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: NOTIFICATION_MESSAGES.RETRIEVED,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * Marks a distinct targeted user notification as read.
 */
const markNotificationAsRead = catchAsync(async (req, res) => {
  const result = await NotificationService.markNotificationAsRead(
    req.params.id,
    req.user
  );

  // FIXED: res is now inside the object
  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: NOTIFICATION_MESSAGES.MARKED_AS_READ,
    data: result,
  });
});

/**
 * Marks all pending unread notifications for the active user as read.
 */
const markAllNotificationsAsRead = catchAsync(async (req, res) => {
  const result = await NotificationService.markAllNotificationsAsRead(
    req.user
  );

  // FIXED: res is now inside the object
  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: NOTIFICATION_MESSAGES.ALL_MARKED_AS_READ,
    data: result,
  });
});

export const NotificationController = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};

