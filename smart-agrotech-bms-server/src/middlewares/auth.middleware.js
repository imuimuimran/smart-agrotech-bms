import ApiError from "../shared/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

import STATUS from "../constants/status.js";

import { User } from "../modules/users/index.js";

import {
    verifyAccessToken,
    AUTH_MESSAGES,
} from "../modules/auth/index.js";

const verifyToken = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization;

        if (!authorization) {
            throw new ApiError(
                HTTP_STATUS.UNAUTHORIZED,
                AUTH_MESSAGES.TOKEN_REQUIRED
            );
        }

        if (!authorization.startsWith("Bearer ")) {
            throw new ApiError(
                HTTP_STATUS.UNAUTHORIZED,
                AUTH_MESSAGES.INVALID_TOKEN
            );
        }

        const token = authorization.split(" ")[1];

        const decoded = verifyAccessToken(token);

        const user = await User.findById(decoded.id);

        if (!user) {

            throw new ApiError(
                HTTP_STATUS.UNAUTHORIZED,
                AUTH_MESSAGES.UNAUTHORIZED
            );
        }

        if (user.status !== STATUS.ACTIVE) {
            throw new ApiError(
                HTTP_STATUS.FORBIDDEN,
                AUTH_MESSAGES.ACCOUNT_DEACTIVATED,
            );
        }

        // req.user = user;
        req.user = {
            id: user._id,
            publicId: user.publicId,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
        };

        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return next(
                new ApiError(HTTP_STATUS.UNAUTHORIZED, AUTH_MESSAGES.INVALID_TOKEN)
            );
        }
        next(error);
    }
};

export default verifyToken;