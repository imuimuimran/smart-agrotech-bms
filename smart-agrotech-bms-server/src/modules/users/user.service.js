import QueryBuilder from "../../builder/QueryBuilder.js";

import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js";

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
  ];

  forbiddenFields.forEach((field) => {
    delete payload[field];
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


export const UserService = {
  getUsers,
  getUser,
  updateUser,
};

