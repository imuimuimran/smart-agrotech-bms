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


export const BrandService = {
  createBrand,
  getBrands,
  getBrand,
};
