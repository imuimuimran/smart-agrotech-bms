import QueryBuilder from "../../builder/QueryBuilder.js";

import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js";

import ROLES from "../../constants/roles.js";
import USER_STATUS from "../../constants/userStatus.js";

import { User } from "./user.model.js";

import { USER_SORT_FIELDS, } from "./user.constants.js";
import { USER_MESSAGES } from "./user.constants.js";
import { sanitizeUser } from "./user.utils.js";

import findByPublicId from "../../shared/findByPublicId.js";

const getUsers = async (query) => {
  const queryBuilder =
    new QueryBuilder(
      User.find(),
      query
    )
      .search(["name", "email"])
      .filter()
      .sort(USER_SORT_FIELDS)
      .paginate()
      .fields();

  const data = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  return {
    meta,
    data,
  };
};

const getUser = async (publicId) => {
  const user = await findByPublicId(
    User,
    publicId,
    USER_MESSAGES.USER_NOT_FOUND
  );

  return sanitizeUser(user);
};

const updateUser = async (
  publicId,
  payload
) => {
  const user =
    await findByPublicId(
      User,
      publicId,
      USER_MESSAGES.USER_NOT_FOUND
    );

  const forbiddenFields = [
    "role",
    "status",
    "password",
    "publicId",
    "_id",
    "__v",
    "isDeleted",
    "deletedAt",
  ];

  forbiddenFields.forEach((field) => {
    if (payload && field in payload) {
      delete payload[field];
    }
  });

  if (
    payload.email &&
    payload.email !== user.email
  ) {
    const existingUser =
      await User.findOne({
        email: payload.email,
      });

    if (existingUser) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        USER_MESSAGES.EMAIL_ALREADY_EXISTS
      );
    }
  }

  Object.assign(user, payload);

  await user.save({
    validateBeforeSave: true,
  });

  return sanitizeUser(user);
};


const updateUserRole = async (
  publicId,
  role,
  currentUser
) => {
  const user =
    await findByPublicId(
      User,
      publicId,
      USER_MESSAGES.USER_NOT_FOUND
    );

  if (
    user.publicId === currentUser.publicId
  ) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      USER_MESSAGES.CANNOT_CHANGE_OWN_ROLE
    );
  }

  if (user.role === role) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      USER_MESSAGES.ROLE_ALREADY_ASSIGNED
    );
  }

  user.role = role;

  await user.save();

  return sanitizeUser(user);
};

const updateUserStatus = async (
  publicId,
  status,
  currentUser
) => {
  const user =
    await findByPublicId(
      User,
      publicId,
      USER_MESSAGES.USER_NOT_FOUND
    );

  if (
    user.publicId === currentUser.publicId &&
    status === USER_STATUS.INACTIVE
  ) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      USER_MESSAGES.CANNOT_CHANGE_OWN_STATUS
    );
  }

  if (user.status === status) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      USER_MESSAGES.STATUS_ALREADY_ASSIGNED
    );
  }

  if (
    user.role === ROLES.ADMIN &&
    user.status === USER_STATUS.ACTIVE &&
    status === USER_STATUS.INACTIVE
  ) {
    const activeAdminCount =
      await User.countDocuments({
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
      });

    if (activeAdminCount <= 1) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        USER_MESSAGES.LAST_ADMIN_DEACTIVATION
      );
    }
  }

  user.status = status;

  await user.save();

  return sanitizeUser(user);
};

const deleteUser = async (
  publicId,
  currentUser
) => {
  const user =
    await findByPublicId(
      User,
      publicId,
      USER_MESSAGES.USER_NOT_FOUND
    );

  if (
    user.publicId ===
    currentUser.publicId
  ) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      USER_MESSAGES
        .CANNOT_DELETE_OWN_ACCOUNT
    );
  }

  if (user.isDeleted) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      USER_MESSAGES
        .USER_ALREADY_DELETED
    );
  }

  if (
    user.role === ROLES.ADMIN &&
    user.status ===
      USER_STATUS.ACTIVE
  ) {
    const activeAdmins =
      await User.countDocuments({
        role: ROLES.ADMIN,
        status:
          USER_STATUS.ACTIVE,
        isDeleted: false,
      });

    if (activeAdmins <= 1) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        USER_MESSAGES
          .LAST_ADMIN_DELETE
      );
    }
  }

  user.isDeleted = true;

  user.deletedAt =
    new Date();

  await user.save();

  return {
    publicId:
      user.publicId,
  };
};

const getMyProfile =
async (publicId) => {

    const user =
        await findByPublicId(

            User,

            publicId,

            USER_MESSAGES.USER_NOT_FOUND

        );

    return sanitizeUser(user);

};

const updateMyProfile =
async (
    publicId,
    payload
) => {

    const user =
        await findByPublicId(

            User,

            publicId,

            USER_MESSAGES.USER_NOT_FOUND

        );

    const allowedFields = [
        "name",
        "phone",
        "profileImage",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
        if (payload[field] !== undefined) {
            updates[field] = payload[field];
        }
    });

    Object.assign(user, updates);

    await user.save();

    return sanitizeUser(user);

};

export const UserService = {
  getUsers,
  getUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getMyProfile,
  updateMyProfile,
};

