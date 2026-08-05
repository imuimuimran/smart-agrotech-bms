import Brand from "./brand.model.js";

/**
 * Strips out internal MongoDB properties and soft-delete logs before returning data
 */
export const sanitizeBrand = (brand) => {
  if (!brand) return null;

  return {
    publicId: brand.publicId,
    brandName: brand.brandName,
    brandCode: brand.brandCode,
    description: brand.description,
    logo: brand.logo,
    website: brand.website,
    country: brand.country,
    status: brand.status,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
};

/**
 * Scans the latest database entry (including soft-deleted ones) to generate a sequential enterprise ID
 */
export const generateBrandPublicId = async () => {
  const lastBrand = await Brand.findOne({}, {}, { withDeleted: true })
    .sort({ createdAt: -1 })
    .select("publicId")
    .withDeleted();

  if (!lastBrand) {
    return "BRD-100001";
  }

  const lastNumber = Number(lastBrand.publicId.replace("BRD-", ""));
  return `BRD-${String(lastNumber + 1).padStart(6, "0")}`;
};

/**
 * Trims whitespace and collapses consecutive spaces into a single blank space character
 */
export const normalizeBrandName = (name) => {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ");
};

/**
 * Checks for website string presence
 */
export const hasWebsite = (brand) => {
  return Boolean(brand?.website);
};
