import bcrypt from "bcryptjs";
import validator from "validator";

import { User } from "../users/index.js";

import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js";

import generatePublicId from "../../utils/generatePublicId.js";

import { generateAccessToken, buildJwtPayload, } from "./auth.utils.js";

import { sanitizeUser, } from "../users/user.utils.js";

import { AUTH_MESSAGES } from "./auth.constants.js";

const registerUser = async (payload) => {
  const email = validator.normalizeEmail(payload.email);

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "Email already exists."
    );
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);

  const user = await User.create({
    ...payload,
    email,
    password: hashedPassword,
    // publicId: `USR-${Date.now()}`,
    publicId: generatePublicId("USR"),
    isDeleted: false,
  });

  return sanitizeUser(user);
};

const loginUser = async ({ email, password }) => {
  const normalizedEmail = validator.normalizeEmail(email);

  const user = await User.findOne({
    email: normalizedEmail,
  })
  .select("+password")
  .setOptions({ skipDeletedCheck: true });

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      AUTH_MESSAGES.INVALID_CREDENTIALS
    );
  }

  const isPasswordMatched = await bcrypt.compare(
    password,
    user.password
  );

  if (!isPasswordMatched) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      AUTH_MESSAGES.INVALID_CREDENTIALS
    );
  }

  user.lastLogin = new Date();

  // await user.save();
  await user.save({
    validateBeforeSave: true,
  });

  const token = generateAccessToken(
    buildJwtPayload(user)
  );

  user.password = undefined;

  return {
    token,
    user: sanitizeUser(user),
  };
};

export const AuthService = {
  registerUser,
  loginUser,
};