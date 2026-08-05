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
  isCircularHierarchy,
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

const getProductCategory = async (publicId) => {
  const category = await ProductCategory.findOne({ publicId }).populate(
    "parentCategory",
    "publicId categoryName categoryCode"
  );

  if (!category) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      PRODUCT_CATEGORY_MESSAGES.CATEGORY_NOT_FOUND
    );
  }

  return sanitizeProductCategory(category);
};

const updateProductCategory = async (publicId, payload, reqUser) => {
  const category = await ProductCategory.findOne({ publicId });

  if (!category) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      PRODUCT_CATEGORY_MESSAGES.CATEGORY_NOT_FOUND
    );
  }

  // Duplicate Category Name Validation
  if (payload.categoryName && payload.categoryName !== category.categoryName) {
    const nameExists = await ProductCategory.exists({
      categoryName: payload.categoryName,
      publicId: { $ne: publicId },
    });

    if (nameExists) {
      throw new ApiError(
        httpStatus.CONFLICT,
        PRODUCT_CATEGORY_MESSAGES.CATEGORY_NAME_ALREADY_EXISTS
      );
    }
  }

  // Duplicate Category Code Validation
  if (payload.categoryCode && payload.categoryCode !== category.categoryCode) {
    const codeExists = await ProductCategory.exists({
      categoryCode: payload.categoryCode,
      publicId: { $ne: publicId },
    });

    if (codeExists) {
      throw new ApiError(
        httpStatus.CONFLICT,
        PRODUCT_CATEGORY_MESSAGES.CATEGORY_CODE_ALREADY_EXISTS
      );
    }
  }

  // Parent Category Validation & Self-Parent Prevention
  if (payload.parentCategory) {
    const parent = await ProductCategory.findById(payload.parentCategory);

    if (!parent) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        PRODUCT_CATEGORY_MESSAGES.PARENT_CATEGORY_NOT_FOUND
      );
    }

    if (parent.publicId === publicId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        PRODUCT_CATEGORY_MESSAGES.INVALID_PARENT_CATEGORY
      );
    }

    const circular = await isCircularHierarchy(category._id, payload.parentCategory);
    if (circular) {
      throw new ApiError(httpStatus.BAD_REQUEST, PRODUCT_CATEGORY_MESSAGES.CIRCULAR_CATEGORY_HIERARCHY);
    }

    // Automatically calculate nesting tier height
    payload.level = parent.level + 1;
  } else if (payload.parentCategory === null) {
    // If explicitly clearing parent category, reset back to root tier
    payload.level = 0;
  }

  // Inject audit details
  payload.updatedBy = reqUser.publicId;

  const updatedCategory = await ProductCategory.findOneAndUpdate(
    { publicId },
    payload,
    {
      new: true,
      runValidators: true,
    }
  ).populate("parentCategory", "publicId categoryName categoryCode");

  return sanitizeProductCategory(updatedCategory);
};

const deleteProductCategory = async (publicId, reqUser) => {
  // Use .find() over configuration bypass to bypass pre-find logic if checking deleted state manually
  // or use direct findOne as it naturally filters out active items depending on index scope.
  const category = await ProductCategory.findOne({ publicId });

  if (!category) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      PRODUCT_CATEGORY_MESSAGES.CATEGORY_NOT_FOUND
    );
  }

  // Already Deleted Check
  if (category.isDeleted) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      PRODUCT_CATEGORY_MESSAGES.CATEGORY_ALREADY_DELETED
    );
  }

  // Child Category Existence Check
  const childExists = await ProductCategory.exists({
    parentCategory: category._id,
    isDeleted: false,
  });

  if (childExists) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      PRODUCT_CATEGORY_MESSAGES.CATEGORY_HAS_CHILDREN
    );
  }

  // Execute State Isolation Updates
  category.isDeleted = true;
  category.deletedAt = new Date();
  category.deletedBy = reqUser.publicId;
  category.updatedBy = reqUser.publicId;

  await category.save();
};

// Restore Core Business Service Layer Method 
const restoreProductCategory = async (publicId, reqUser) => {
  const category = await ProductCategory.findOne({ publicId }).withDeleted();

  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, PRODUCT_CATEGORY_MESSAGES.CATEGORY_NOT_FOUND);
  }
  if (!category.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, PRODUCT_CATEGORY_MESSAGES.CATEGORY_NOT_DELETED);
  }

  if (category.parentCategory) {
    const parent = await ProductCategory.findOne({ _id: category.parentCategory }).withDeleted();
    if (!parent) throw new ApiError(httpStatus.NOT_FOUND, PRODUCT_CATEGORY_MESSAGES.PARENT_CATEGORY_NOT_FOUND);
    if (parent.isDeleted) throw new ApiError(httpStatus.BAD_REQUEST, PRODUCT_CATEGORY_MESSAGES.PARENT_CATEGORY_DELETED);
    if (parent.status !== "active") throw new ApiError(httpStatus.BAD_REQUEST, PRODUCT_CATEGORY_MESSAGES.PARENT_CATEGORY_INACTIVE);
  }

  category.isDeleted = false;
  category.deletedAt = null;
  category.deletedBy = null;
  category.updatedBy = reqUser.publicId;

  await category.save();
  return sanitizeProductCategory(category);
};

export const ProductCategoryService = {
  createProductCategory,
  getProductCategories,
  getProductCategory,
  updateProductCategory,
  deleteProductCategory,
  restoreProductCategory, 
};
