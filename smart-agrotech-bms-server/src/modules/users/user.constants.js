import ROLES from "../../constants/roles.js";
import STATUS from "../../constants/status.js";

export const USER_ROLES = ROLES;
export const USER_STATUS = STATUS;

export const USER_MESSAGES = Object.freeze({
  FETCH_ALL_SUCCESS: "Users retrieved successfully.",

  FETCH_ONE_SUCCESS: "User retrieved successfully.",

  UPDATE_SUCCESS: "User updated successfully.",

  DELETE_SUCCESS: "User deleted successfully.",

  STATUS_UPDATED: "User status updated successfully.",

  ROLE_UPDATED: "User role updated successfully.",

  USER_NOT_FOUND: "User not found.",

  EMAIL_ALREADY_EXISTS: "Email already exists.",

  ROLE_ALREADY_ASSIGNED: "User already has this role.",

  CANNOT_CHANGE_OWN_ROLE: "You cannot change your own role.",

  CANNOT_CHANGE_OWN_STATUS: "You cannot deactivate your own account.",

  STATUS_ALREADY_ASSIGNED: "User already has this status.",

  LAST_ADMIN_DEACTIVATION: "The last active administrator cannot be deactivated.",

  USER_ALREADY_DELETED: "User has already been deleted.",

  CANNOT_DELETE_OWN_ACCOUNT: "You cannot delete your own account.",

  LAST_ADMIN_DELETE: "The last active administrator cannot be deleted.",

  PROFILE_FETCH_SUCCESS: "Profile retrieved successfully.",

  PROFILE_UPDATED: "Profile updated successfully.",

  PASSWORD_CHANGED: "Password changed successfully.",

  CURRENT_PASSWORD_INVALID: "Current password is incorrect.",

  PASSWORD_REUSE: "New password cannot be the same as the current password.",
});

export const USER_SORT_FIELDS = [
  "name",
  "email",
  "role",
  "status",
  "createdAt",
  "updatedAt",
  "lastLogin",
];