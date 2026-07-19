import HTTP_STATUS from "../constants/httpStatus.js";
import { ZodError } from "zod";

// const errorMiddleware = (err, req, res, next) => {
//   console.error(err);

//   const statusCode =
//     err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

//   res.status(statusCode).json({
//     success: false,
//     message: err.message || "Internal Server Error",
//     errors: err.errors || [],
//     ...(process.env.NODE_ENV === "development" && {
//       stack: err.stack,
//     }),
//   });
// };


const errorMiddleware = (err, req, res, next) => {
  // Check if the error came from Zod validation
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      // Join array paths with dots (e.g., ['body', 'email'] becomes 'body.email')
      field: issue.path.join("."), 
      message: issue.message,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: formattedErrors,
    });
  }

  // Your existing fallback for other types of errors (MongoDB, JWT, etc.)
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export default errorMiddleware;