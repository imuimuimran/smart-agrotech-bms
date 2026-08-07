import httpStatus from "../../constants/httpStatus.js";
import Brand from "./brand.model.js";
import ApiError from "../../shared/ApiError.js";
import QueryBuilder from "../../builder/QueryBuilder.js";
import { 
  BRAND_MESSAGES,
  BRAND_SEARCHABLE_FIELDS,
  BRAND_FILTERABLE_FIELDS,
} from "./brand.constants.js";
import {
  sanitizeBrand,
  normalizeBrandName,
  generateBrandPublicId,
} from "./brand.utils.js";

const createBrand = async (payload, reqUser) => {
  payload.brandName = normalizeBrandName(payload.brandName);

  /*
  -------------------------
  Duplicate Name Check
  -------------------------
  */
  const nameExists = await Brand.exists({
    brandName: payload.brandName,
  });

  if (nameExists) {
    throw new ApiError(
      httpStatus.CONFLICT,
      BRAND_MESSAGES.BRAND_NAME_ALREADY_EXISTS
    );
  }

  /*
  -------------------------
  Duplicate Code Check
  -------------------------
  */
  const codeExists = await Brand.exists({
    brandCode: payload.brandCode,
  });

  if (codeExists) {
    throw new ApiError(
      httpStatus.CONFLICT,
      BRAND_MESSAGES.BRAND_CODE_ALREADY_EXISTS
    );
  }

  /*
  -------------------------
  Public ID Sequence Hook
  -------------------------
  */
  payload.publicId = await generateBrandPublicId();

  /*
  -------------------------
  Audit Tracking Injection
  -------------------------
  */
  payload.createdBy = reqUser.publicId;
  payload.updatedBy = reqUser.publicId;

  /*
  -------------------------
  Save to MongoDB Atlas
  -------------------------
  */
  const brand = await Brand.create(payload);

  return sanitizeBrand(brand);
};

const getBrands = async (query) => {
  const brandQuery = new QueryBuilder(Brand.find(), query)
    .search(BRAND_SEARCHABLE_FIELDS)
    .filter(BRAND_FILTERABLE_FIELDS)
    .sort()
    .paginate()
    .fields();

  const brands = await brandQuery.modelQuery;
  const meta = await brandQuery.countTotal();

  return {
    meta,
    data: brands.map(sanitizeBrand),
  };
};

const getBrand = async (publicId) => {
  const brand = await Brand.findOne({ publicId });

  if (!brand) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      BRAND_MESSAGES.BRAND_NOT_FOUND
    );
  }

  return sanitizeBrand(brand);
};

const updateBrand = async (publicId, payload, reqUser) => {
  /*
  -------------------------
  Find Existing Brand
  -------------------------
  */
  const brand = await Brand.findOne({ publicId });

  if (!brand) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      BRAND_MESSAGES.BRAND_NOT_FOUND
    );
  }

  /*
  -------------------------
  Normalize Brand Name
  -------------------------
  */
  if (payload.brandName) {
    payload.brandName = normalizeBrandName(payload.brandName);
  }

  /*
  -------------------------
  Duplicate Brand Name
  -------------------------
  */
  if (payload.brandName) {
    const existingName = await Brand.findOne({
      brandName: payload.brandName,
      publicId: { $ne: publicId },
    });

    if (existingName) {
      throw new ApiError(
        httpStatus.CONFLICT,
        BRAND_MESSAGES.BRAND_NAME_ALREADY_EXISTS
      );
    }
  }

  /*
  -------------------------
  Duplicate Brand Code
  -------------------------
  */
  if (payload.brandCode) {
    const existingCode = await Brand.findOne({
      brandCode: payload.brandCode,
      publicId: { $ne: publicId },
    });

    if (existingCode) {
      throw new ApiError(
        httpStatus.CONFLICT,
        BRAND_MESSAGES.BRAND_CODE_ALREADY_EXISTS
      );
    }
  }

  /*
  -------------------------
  Audit Trace Capture
  -------------------------
  */
  payload.updatedBy = reqUser.publicId;

  /*
  -------------------------
  Update Documents Data
  -------------------------
  */
  const updatedBrand = await Brand.findOneAndUpdate(
    { publicId },
    payload,
    {
      new: true,
      runValidators: true,
    }
  );

  return sanitizeBrand(updatedBrand);
};


export const BrandService = {
  createBrand,
  getBrands,
  getBrand,
  updateBrand,
};
