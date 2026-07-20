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