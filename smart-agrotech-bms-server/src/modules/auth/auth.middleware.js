import HTTP_STATUS from "../constants/httpStatus.js";
import ApiError from "../shared/ApiError.js";

const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(
        new ApiError(
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Validation failed.",
          errors
        )
      );
    }

    req.body = result.data.body;
    req.params = result.data.params || req.params;
    req.query = result.data.query || req.query;

    next();
  };
};

export default validate;