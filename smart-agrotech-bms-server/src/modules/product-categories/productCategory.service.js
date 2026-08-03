import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../shared/ApiError.js";
import QueryBuilder from "../../builder/QueryBuilder.js";
import ProductCategory from "./productCategory.model.js";
import { 
  PRODUCT_CATEGORY_MESSAGES,
  PRODUCT_CATEGORY_SEARCHABLE_FIELDS,
  PRODUCT_CATEGORY_FILTERABLE_FIELDS, 
} from "./productCategory.constants.js";
import {
  generateCategoryPublicId,
  sanitizeProductCategory,
} from "./productCategory.utils.js";

const createProductCategory = async (payload, reqUser) => {
  // Duplicate category name validation
  const nameExists = await ProductCategory.exists({
    categoryName: payload.categoryName,
  });

  if (nameExists) {
    throw new ApiError(
      httpStatus.CONFLICT,
      PRODUCT_CATEGORY_MESSAGES.CATEGORY_NAME_ALREADY_EXISTS
    );
  }

  // Duplicate category code validation
  const codeExists = await ProductCategory.exists({
    categoryCode: payload.categoryCode,
  });

  if (codeExists) {
    throw new ApiError(
      httpStatus.CONFLICT,
      PRODUCT_CATEGORY_MESSAGES.CATEGORY_CODE_ALREADY_EXISTS
    );
  }

  // Parent category existence validation
  if (payload.parentCategory) {
    const parentExists = await ProductCategory.exists({
      _id: payload.parentCategory,
    });

    if (!parentExists) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        PRODUCT_CATEGORY_MESSAGES.PARENT_CATEGORY_NOT_FOUND
      );
    }
  }

  // Inject system auto-generated and audit fields
  payload.publicId = await generateCategoryPublicId();
  payload.createdBy = reqUser.publicId;
  payload.updatedBy = reqUser.publicId;

  const category = await ProductCategory.create(payload);

  return sanitizeProductCategory(category);
};

const getProductCategories = async (query) => {
  const categoryQuery = new QueryBuilder(
    ProductCategory.find().populate(
      "parentCategory",
      "publicId categoryName categoryCode"
    ),
    query
  )
    .search(PRODUCT_CATEGORY_SEARCHABLE_FIELDS)
    .filter(PRODUCT_CATEGORY_FILTERABLE_FIELDS)
    .sort()
    .paginate()
    .fields();

  const data = await categoryQuery.modelQuery;
  const meta = await categoryQuery.countTotal();

  return {
    meta,
    data: data.map(sanitizeProductCategory),
  };
};

export const ProductCategoryService = {
  createProductCategory,
  getProductCategories,
};
