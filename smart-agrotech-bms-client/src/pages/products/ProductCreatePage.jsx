// src/pages/products/ProductCreatePage.jsx

import { LayersPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProductService } from "../../services/productService";
import { LookupService } from "../../services/lookupService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const INITIAL_FORM_STATE = {
  productName: "",
  productCode: "",
  sku: "",
  barcode: "",
  categoryId: "",
  brandId: "",
  productType: "physical",
  shortDescription: "",
  description: "",
  unit: "Pcs",
  unitConversion: "1",
  purchasePrice: "0",
  sellingPrice: "",
  minimumSellingPrice: "0",
  taxType: "none",
  taxRate: "0",
  trackInventory: true,
  minimumStockLevel: "0",
  maximumStockLevel: "1000",
  reorderLevel: "10",
  images: "",
  status: "active",
};

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

function unwrapList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item) => {
        const field = item?.field ? `${item.field}: ` : "";
        return `${field}${item?.message || item?.msg || String(item)}`;
      })
      .join(" ");
  }

  if (data?.errors && typeof data.errors === "object") {
    return Object.entries(data.errors)
      .map(([field, value]) => {
        const message = Array.isArray(value) ? value.join(", ") : String(value);
        return `${field}: ${message}`;
      })
      .join(" ");
  }

  return (
    data?.message ||
    error?.message ||
    "Product creation failed. Please try again."
  );
}

// Only MongoDB document IDs are valid for categoryId and brandId.
// Never use publicId values such as CAT-100001 here.
function getMongoId(item) {
  const candidate = item?._id ?? item?.id;

  if (typeof candidate !== "string") return "";
  return OBJECT_ID_REGEX.test(candidate) ? candidate : "";
}

function getCategoryName(item) {
  return item?.categoryName || item?.name || item?.title || "Unnamed category";
}

function getBrandName(item) {
  return item?.brandName || item?.name || item?.title || "Unnamed brand";
}

function numberValue(value, label, options = {}) {
  const { min = 0, required = false } = options;

  if (value === "" || value === null || value === undefined) {
    if (required) throw new Error(`${label} is required.`);
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < min) {
    throw new Error(
      `${label} must be a valid number greater than or equal to ${min}.`
    );
  }

  return number;
}

function FieldError({ children }) {
  return children ? (
    <p className="mt-1 text-sm text-red-600" role="alert">
      {children}
    </p>
  ) : null;
}

// export function ProductCreatePage({ onBack, onSuccess }) {
export function ProductCreatePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ ...INITIAL_FORM_STATE });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLookups() {
      setIsLoadingLookups(true);
      setLookupError("");

      try {
        const [categoryResult, brandResult] = await Promise.all([
          LookupService.getCategories(),
          LookupService.getBrands(),
        ]);

        if (!active) return;

        setCategories(unwrapList(categoryResult));
        setBrands(unwrapList(brandResult));
      } catch (error) {
        if (active) {
          setLookupError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setIsLoadingLookups(false);
        }
      }
    }

    loadLookups();

    return () => {
      active = false;
    };
  }, []);

  // Filter out records without valid MongoDB ObjectIds.
  // This prevents sending public IDs to the backend ObjectId validator.
  const categoryOptions = useMemo(
    () =>
      categories.filter(
        (item) => getMongoId(item) && item?.status !== "inactive"
      ),
    [categories]
  );

  const brandOptions = useMemo(
    () =>
      brands.filter(
        (item) => getMongoId(item) && item?.status !== "inactive"
      ),
    [brands]
  );

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setValidationError("");
    setApiError("");
    setSuccessMessage("");
  }

  function validateAndBuildPayload() {
    const productName = formData.productName.trim();
    const productCode = formData.productCode.trim();
    const sku = formData.sku.trim();
    const categoryId = formData.categoryId;
    const brandId = formData.brandId;

    if (!productName) {
      throw new Error("Product name is required.");
    }

    if (!productCode) {
      throw new Error("Product code is required.");
    }

    if (!/^[A-Za-z0-9_-]+$/.test(productCode)) {
      throw new Error(
        "Product code may contain only letters, numbers, hyphens, and underscores."
      );
    }

    if (!sku) {
      throw new Error("SKU is required.");
    }

    if (sku.length < 2 || sku.length > 80 || !/^[A-Za-z0-9_-]+$/.test(sku)) {
      throw new Error(
        "SKU must be 2–80 characters and contain only letters, numbers, hyphens, and underscores."
      );
    }

    if (!categoryId || !OBJECT_ID_REGEX.test(categoryId)) {
      throw new Error(
        "Select a valid category. The category API must provide its MongoDB _id."
      );
    }

    // The supplied backend model and create service require a brand.
    if (!brandId || !OBJECT_ID_REGEX.test(brandId)) {
      throw new Error(
        "Select a valid brand. The brand API must provide its MongoDB _id."
      );
    }

    if (formData.barcode.trim() && formData.barcode.trim().length < 4) {
      throw new Error("Barcode must contain at least 4 characters.");
    }

    if (!["physical", "service", "digital"].includes(formData.productType)) {
      throw new Error("Select a valid product type.");
    }

    if (!formData.unit.trim()) {
      throw new Error("Unit is required.");
    }

    if (!["none", "percentage", "fixed"].includes(formData.taxType)) {
      throw new Error("Select a valid tax type.");
    }

    const conversionFactor = numberValue(
      formData.unitConversion,
      "Unit conversion",
      { min: 0.000001, required: true }
    );

    const purchasePrice = numberValue(
      formData.purchasePrice,
      "Purchase price"
    );

    const sellingPrice = numberValue(
      formData.sellingPrice,
      "Selling price",
      { required: true }
    );

    const minimumSellingPrice = numberValue(
      formData.minimumSellingPrice,
      "Minimum selling price"
    );

    let taxRate = numberValue(formData.taxRate, "Tax rate");

    const minimumStockLevel = numberValue(
      formData.minimumStockLevel,
      "Minimum stock level"
    );

    const maximumStockLevel = numberValue(
      formData.maximumStockLevel,
      "Maximum stock level"
    );

    const reorderLevel = numberValue(
      formData.reorderLevel,
      "Reorder level"
    );

    if (sellingPrice < minimumSellingPrice) {
      throw new Error(
        "Selling price must be greater than or equal to minimum selling price."
      );
    }

    if (maximumStockLevel < minimumStockLevel) {
      throw new Error(
        "Maximum stock level must be greater than or equal to minimum stock level."
      );
    }

    if (formData.taxType === "none" && taxRate !== 0) {
      throw new Error('Tax rate must be 0 when tax type is "none".');
    }

    if (formData.taxType === "percentage" && taxRate > 100) {
      throw new Error("Percentage tax rate cannot exceed 100.");
    }

    if (!formData.trackInventory) {
      // Keep entered stock thresholds, but inventory tracking remains disabled.
    }

    const imageUrls = formData.images
      .split(/\n|,/)
      .map((url) => url.trim())
      .filter(Boolean);

    if (imageUrls.length > 20) {
      throw new Error("You can add a maximum of 20 image URLs.");
    }

    const invalidImageUrl = imageUrls.find((url) => {
      try {
        const parsed = new URL(url);
        return !["http:", "https:"].includes(parsed.protocol);
      } catch {
        return true;
      }
    });

    if (invalidImageUrl) {
      throw new Error(`Invalid image URL: ${invalidImageUrl}`);
    }

    const images = imageUrls.map((url, index) => ({
      url,
      alt: productName,
      isPrimary: index === 0,
    }));

    if (formData.taxType === "none") {
      taxRate = 0;
    }

    return {
      productName,
      productCode,
      sku,
      ...(formData.barcode.trim()
        ? { barcode: formData.barcode.trim() }
        : {}),
      categoryId,
      brandId,
      productType: formData.productType,
      shortDescription: formData.shortDescription.trim(),
      description: formData.description.trim(),
      unit: formData.unit.trim(),
      unitConversion: {
        baseUnit: formData.unit.trim(),
        conversionFactor,
      },
      pricing: {
        purchasePrice,
        sellingPrice,
        minimumSellingPrice,
      },
      tax: {
        taxType: formData.taxType,
        taxRate,
      },
      inventoryConfig: {
        trackInventory: Boolean(formData.trackInventory),
        minimumStockLevel,
        maximumStockLevel,
        reorderLevel,
      },
      images,
      status: formData.status,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setValidationError("");
    setApiError("");
    setSuccessMessage("");

    let payload;

    try {
      payload = validateAndBuildPayload();
    } catch (error) {
      setValidationError(error.message);
      return;
    }

    setIsSubmitting(true);

    try {
      // await ProductService.createProduct(payload);

      // setSuccessMessage("Product created successfully.");
      // setFormData({ ...INITIAL_FORM_STATE });

      // if (typeof onSuccess === "function") {
      //   await onSuccess();
      // }

      await ProductService.createProduct(payload);
      navigate("/products");

    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingLookups) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading categories and brands..." />
      </div>
    );
  }

  const hasValidLookups =
    categoryOptions.length > 0 && brandOptions.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create Product
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Enter product details, pricing, and inventory configuration.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          // onClick={onBack}
          onClick={() => navigate("/products")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </header>

      {lookupError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <p className="font-semibold">
            Could not load category or brand options.
          </p>
          <p className="mt-1">{lookupError}</p>
        </div>
      )}

      {!lookupError && !hasValidLookups && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          role="alert"
        >
          <p className="font-semibold">
            Category or brand records are missing valid MongoDB IDs.
          </p>
          <p className="mt-1">
            The product API requires 24-character MongoDB ObjectIds for both
            categoryId and brandId. Your lookup endpoints must return each
            record's _id; publicId values such as CAT-100001 cannot be used.
          </p>
        </div>
      )}

      {validationError && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          role="alert"
        >
          {validationError}
        </div>
      )}

      {apiError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {apiError}
        </div>
      )}

      {successMessage && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          role="status"
        >
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">
            Basic information
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Product name *"
              id="productName"
              name="productName"
              value={formData.productName}
              onChange={handleChange}
              required
            />

            <Input
              label="Product code *"
              id="productCode"
              name="productCode"
              value={formData.productCode}
              onChange={handleChange}
              required
            />

            <Input
              label="SKU *"
              id="sku"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              required
            />

            <Input
              label="Barcode"
              id="barcode"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
            />

            <Input
              label="Short description"
              id="shortDescription"
              name="shortDescription"
              value={formData.shortDescription}
              onChange={handleChange}
            />

            <div className="sm:col-span-2">
              <label
                htmlFor="description"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">
            Classification and measurement
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="categoryId"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Category *
              </label>

              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Select category</option>

                {categoryOptions.map((item) => {
                  const id = getMongoId(item);

                  return (
                    <option key={id} value={id}>
                      {getCategoryName(item)}
                    </option>
                  );
                })}
              </select>

              {categoryOptions.length === 0 && (
                <FieldError>
                  No categories with valid MongoDB ObjectIds were returned.
                </FieldError>
              )}
            </div>

            <div>
              <label
                htmlFor="brandId"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Brand *
              </label>

              <select
                id="brandId"
                name="brandId"
                value={formData.brandId}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Select brand</option>

                {brandOptions.map((item) => {
                  const id = getMongoId(item);

                  return (
                    <option key={id} value={id}>
                      {getBrandName(item)}
                    </option>
                  );
                })}
              </select>

              {brandOptions.length === 0 && (
                <FieldError>
                  No brands with valid MongoDB ObjectIds were returned.
                </FieldError>
              )}
            </div>

            <div>
              <label
                htmlFor="productType"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Product type *
              </label>

              <select
                id="productType"
                name="productType"
                value={formData.productType}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="physical">Physical</option>
                <option value="service">Service</option>
                <option value="digital">Digital</option>
              </select>
            </div>

            <Input
              label="Unit *"
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              required
            />

            <Input
              label="Conversion factor *"
              id="unitConversion"
              name="unitConversion"
              type="number"
              min="0.000001"
              step="any"
              value={formData.unitConversion}
              onChange={handleChange}
              required
            />

            <div>
              <label
                htmlFor="status"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">
            Pricing and tax
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Purchase price *"
              id="purchasePrice"
              name="purchasePrice"
              type="number"
              min="0"
              step="any"
              value={formData.purchasePrice}
              onChange={handleChange}
              required
            />

            <Input
              label="Selling price *"
              id="sellingPrice"
              name="sellingPrice"
              type="number"
              min="0"
              step="any"
              value={formData.sellingPrice}
              onChange={handleChange}
              required
            />

            <Input
              label="Minimum selling price *"
              id="minimumSellingPrice"
              name="minimumSellingPrice"
              type="number"
              min="0"
              step="any"
              value={formData.minimumSellingPrice}
              onChange={handleChange}
              required
            />

            <div>
              <label
                htmlFor="taxType"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Tax type
              </label>

              <select
                id="taxType"
                name="taxType"
                value={formData.taxType}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="none">None</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>

            <Input
              label="Tax rate"
              id="taxRate"
              name="taxRate"
              type="number"
              min="0"
              step="any"
              value={formData.taxRate}
              onChange={handleChange}
            />
          </div>
        </Card>

        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">
            Inventory configuration
          </h2>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="trackInventory"
              checked={formData.trackInventory}
              onChange={handleChange}
              className="h-4 w-4"
            />
            Track inventory for this product
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Minimum stock level"
              id="minimumStockLevel"
              name="minimumStockLevel"
              type="number"
              min="0"
              step="any"
              value={formData.minimumStockLevel}
              onChange={handleChange}
            />

            <Input
              label="Maximum stock level"
              id="maximumStockLevel"
              name="maximumStockLevel"
              type="number"
              min="0"
              step="any"
              value={formData.maximumStockLevel}
              onChange={handleChange}
            />

            <Input
              label="Reorder level"
              id="reorderLevel"
              name="reorderLevel"
              type="number"
              min="0"
              step="any"
              value={formData.reorderLevel}
              onChange={handleChange}
            />
          </div>
        </Card>

        <Card className="space-y-3 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">
            Images
          </h2>

          <label
            htmlFor="images"
            className="block text-sm font-medium text-slate-700"
          >
            Image URLs
          </label>

          <textarea
            id="images"
            name="images"
            rows={3}
            value={formData.images}
            onChange={handleChange}
            placeholder="Enter one direct image URL per line, or separate URLs with commas"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          <p className="text-xs text-slate-500">
            Enter direct image URLs. The backend expects an array of objects
            containing url, alt, and isPrimary.
          </p>
        </Card>

        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            // onClick={onBack}
            onClick={() => navigate("/products")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || !hasValidLookups || Boolean(lookupError)}
          >
            <LayersPlus className="w-4 h-4 mr-2" /> 
            <span>
              {isSubmitting ? "Creating product..." : "Create product"}
            </span>
            
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProductCreatePage;
