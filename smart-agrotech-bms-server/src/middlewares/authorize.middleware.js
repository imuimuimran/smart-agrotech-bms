import ApiError from "../shared/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

import { AUTH_MESSAGES } from "../modules/auth/index.js";

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          AUTH_MESSAGES.AUTHENTICATION_REQUIRED
        )
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          HTTP_STATUS.FORBIDDEN,
          AUTH_MESSAGES.FORBIDDEN
        )
      );
    }

    next();
  };
};

export default authorize;