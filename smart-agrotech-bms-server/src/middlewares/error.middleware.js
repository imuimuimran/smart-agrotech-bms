import HTTP_STATUS from "../constants/httpStatus.js";

const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  const statusCode =
    err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  res.status(statusCode).json({
    success: false,
    message:
      err.message || "Internal Server Error",
    errors: err.errors || [],
    stack:
      process.env.NODE_ENV === "development"
        ? err.stack
        : undefined,
  });
};

export default errorMiddleware;