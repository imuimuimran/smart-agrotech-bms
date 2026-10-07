export const NOTIFICATION_TYPES = Object.freeze({
  LOW_STOCK: "low_stock",
  CUSTOMER_DUE: "customer_due",
  SUPPLIER_DUE: "supplier_due",
  SYSTEM: "system",
});

export const NOTIFICATION_MESSAGES = Object.freeze({
  CREATED: "Notification created successfully",
  RETRIEVED: "Notifications retrieved successfully",
  MARKED_AS_READ: "Notification marked as read successfully",
  ALL_MARKED_AS_READ: "All notifications marked as read successfully",
  NOT_FOUND: "Notification not found",
});
