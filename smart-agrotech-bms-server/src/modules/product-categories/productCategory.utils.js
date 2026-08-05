import ProductCategory from "./productCategory.model.js";

/**
 * Generates an enterprise-standard sequential public ID (e.g., CAT-100001)
 */
export const generateCategoryPublicId = async () => {
  // Bypasses global find query middleware by using standard findOne on un-indexed order if needed,
  // but targeting specific sorting tracking latest item regardless of soft delete state.
  // const lastCategory = await ProductCategory.findOne({}, {}, { autocomplete: false })
  //   .sort({ createdAt: -1 })
  //   .select("publicId");
  const lastCategory = await ProductCategory.findOne({}, {}, { withDeleted: true })
    .sort({ createdAt: -1 })
    .select("publicId")
    .withDeleted(); // Ensure we can find the id sequence even if the latest record is deleted

  if (!lastCategory) {
    return "CAT-100001";
  }

  const lastNumber = Number(lastCategory.publicId.replace("CAT-", ""));
  return `CAT-${String(lastNumber + 1).padStart(6, "0")}`;
};

/**
 * Strips out sensitive or internal MongoDB fields before sending response to clients
 */
export const sanitizeProductCategory = (category) => {
  if (!category) return null;
  
  return {
    publicId: category.publicId,
    categoryName: category.categoryName,
    categoryCode: category.categoryCode,
    description: category.description,
    image: category.image,
    parentCategory: category.parentCategory,
    level: category.level,
    sortOrder: category.sortOrder,
    status: category.status,
    isRootCategory: category.isRootCategory,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
};

// Advanced Loop Tree Graph Checker
export const isCircularHierarchy = async (categoryId, parentId) => {
  let currentParent = await ProductCategory.findOne({ _id: parentId }).withDeleted();

  while (currentParent) {
    if (currentParent._id.toString() === categoryId.toString()) {
      return true;
    }
    if (!currentParent.parentCategory) {
      break;
    }
    currentParent = await ProductCategory.findOne({ _id: currentParent.parentCategory }).withDeleted();
  }
  return false;
};
