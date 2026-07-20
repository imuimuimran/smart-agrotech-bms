import ApiError from "./ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

const findByPublicId = async (
  Model,
  publicId,
  notFoundMessage
) => {
  const document = await Model.findOne({
    publicId,
  });

  if (!document) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      notFoundMessage
    );
  }

  return document;
};

export default findByPublicId;