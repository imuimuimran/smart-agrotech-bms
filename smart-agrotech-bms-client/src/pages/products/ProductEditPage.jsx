// src/pages/products/ProductEditPage.jsx

import { useEffect, useMemo, useState } from "react";
import { ProductService } from "../../services/productService";
import { LookupService } from "../../services/lookupService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

function unwrapList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  return [];
}

function unwrapProduct(result) {
  const candidates = [result?.data?.data, result?.data, result?.product, result];
  return candidates.find(
    (candidate) => candidate && typeof candidate === "object" && (candidate._id || candidate.id || candidate.productName)
  ) ?? null;
}

function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((item) => item?.message || item?.msg || (typeof item === "string" ? item : ""))
      .filter(Boolean)
      .join(" ");
  }
  return data?.message || data?.error || error?.message || fallback;
}

function idOf(value) {
  if (value && typeof value === "object") return value._id || value.id || "";
  return value || "";
}

function textOf(value) {
  return value == null ? "" : String(value);
}

function numberValue(value, label, { min = 0, required = false, max } = {}) {
  if (value === "" && !required) return 0;
  if (value === "" && required) throw new Error(`${label} is required.`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || (max !== undefined && number > max)) {
    const range = max === undefined ? `greater than or equal to ${min}` : `between ${min} and ${max}`;
    throw new Error(`${label} must be a valid number ${range}.`);
  }
  return number;
}

const fieldClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";
const labelClassName = "mb-1 block text-sm font-medium text-slate-700";

export function ProductEditPage({ productId, onBack, onSuccess }) {
  const [formData, setFormData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      setApiError("");
      setFormData(null);

      if (!productId) {
        setApiError("A product ID is required to edit a product.");
        setIsLoading(false);
        return;
      }

      try {
        const [productResult, categoryResult, brandResult] = await Promise.all([
          ProductService.getProductById(productId),
          LookupService.getCategories(),
          LookupService.getBrands(),
        ]);
        if (!active) return;

        const product = unwrapProduct(productResult);
        if (!product) throw new Error("The requested product could not be found or its data could not be read.");

        setCategories(unwrapList(categoryResult));
        setBrands(unwrapList(brandResult));

        const pricing = product.pricing || {};
        const tax = product.tax || {};
        const inventory = product.inventoryConfig || {};
        const images = Array.isArray(product.images)
          ? product.images.map((image) => (typeof image === "string" ? image : image?.url || image?.src || "")).filter(Boolean).join("\n")
          : "";

        setFormData({
          productName: textOf(product.productName),
          productCode: textOf(product.productCode),
          sku: textOf(product.sku),
          barcode: textOf(product.barcode),
          categoryId: idOf(product.categoryId || product.category),
          brandId: idOf(product.brandId || product.brand),
          productType: textOf(product.productType || "physical").toLowerCase(),
          shortDescription: textOf(product.shortDescription),
          description: textOf(product.description),
          unit: textOf(product.unit || "Pcs"),
          unitConversion: textOf(product.unitConversion ?? 1),
          purchasePrice: textOf(pricing.purchasePrice ?? "0"),
          sellingPrice: textOf(pricing.sellingPrice ?? ""),
          minimumSellingPrice: textOf(pricing.minimumSellingPrice ?? "0"),
          taxType: textOf(tax.taxType || "none").toLowerCase(),
          taxRate: textOf(tax.taxRate ?? 0),
          trackInventory: inventory.trackInventory ?? true,
          minimumStockLevel: textOf(inventory.minimumStockLevel ?? 0),
          maximumStockLevel: textOf(inventory.maximumStockLevel ?? 1000),
          reorderLevel: textOf(inventory.reorderLevel ?? 10),
          images,
          status: textOf(product.status || "active").toLowerCase(),
        });
      } catch (error) {
        if (active) setApiError(getErrorMessage(error, "Unable to load this product."));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [productId]);

  const categoryOptions = useMemo(
    () => categories.filter((item) => item && (item._id || item.id)),
    [categories]
  );
  const brandOptions = useMemo(
    () => brands.filter((item) => item && (item._id || item.id)),
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

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationError("");
    setApiError("");
    setSuccessMessage("");

    if (!formData) return;
    if (!formData.productName.trim()) {
      setValidationError("Product name is required.");
      return;
    }
    if (!formData.categoryId) {
      setValidationError("Please select a category.");
      return;
    }
    if (!formData.unit.trim()) {
      setValidationError("Unit is required.");
      return;
    }

    let payload;
    try {
      const purchasePrice = numberValue(formData.purchasePrice, "Purchase price");
      const sellingPrice = numberValue(formData.sellingPrice, "Selling price", { required: true });
      const minimumSellingPrice = numberValue(formData.minimumSellingPrice, "Minimum selling price");
      const taxRate = numberValue(formData.taxRate, "Tax rate", { max: 100 });
      const minimumStockLevel = numberValue(formData.minimumStockLevel, "Minimum stock level");
      const maximumStockLevel = numberValue(formData.maximumStockLevel, "Maximum stock level");
      const reorderLevel = numberValue(formData.reorderLevel, "Reorder level");

      if (sellingPrice < minimumSellingPrice) {
        throw new Error("Selling price must be greater than or equal to minimum selling price.");
      }
      if (maximumStockLevel < minimumStockLevel) {
        throw new Error("Maximum stock level must be greater than or equal to minimum stock level.");
      }
      if (reorderLevel < 0) throw new Error("Reorder level cannot be negative.");

      const images = formData.images
        .split(/[\n,]+/)
        .map((url) => url.trim())
        .filter(Boolean);

      // Only send fields supported by the verified backend update service.
      payload = {
        productName: formData.productName.trim(),
        productType: formData.productType,
        shortDescription: formData.shortDescription.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        brandId: formData.brandId || null,
        unit: formData.unit.trim(),
        status: formData.status,
        pricing: { purchasePrice, sellingPrice, minimumSellingPrice },
        tax: { taxType: formData.taxType, taxRate },
        inventoryConfig: {
          trackInventory: Boolean(formData.trackInventory),
          minimumStockLevel,
          maximumStockLevel,
          reorderLevel,
        },
        images,
      };
    } catch (error) {
      setValidationError(error.message || "Please check the form values.");
      return;
    }

    setIsSubmitting(true);
    try {
      await ProductService.updateProduct(productId, payload);
      setSuccessMessage("Product updated successfully.");
      if (typeof onSuccess === "function") {
        await onSuccess();
      }
    } catch (error) {
      setApiError(getErrorMessage(error, "Product update failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading current product details..." />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {apiError || "Product details are unavailable."}
        </div>
        <Button type="button" variant="secondary" onClick={onBack}>Back</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
          <p className="mt-1 text-sm text-gray-600">Update product details supported by the Products API.</p>
        </div>
        <Button type="button" variant="secondary" onClick={onBack} disabled={isSubmitting}>Cancel</Button>
      </header>

      {validationError && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">{validationError}</div>}
      {apiError && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{apiError}</div>}
      {successMessage && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800" role="status">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">Basic information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="productName">Product name *</label>
              <Input id="productName" name="productName" value={formData.productName} onChange={handleChange} required />
            </div>
            <div>
              <label className={labelClassName} htmlFor="productCode">Product code (read-only)</label>
              <Input id="productCode" name="productCode" value={formData.productCode} disabled />
            </div>
            <div>
              <label className={labelClassName} htmlFor="sku">SKU (read-only)</label>
              <Input id="sku" name="sku" value={formData.sku} disabled />
            </div>
            <div>
              <label className={labelClassName} htmlFor="barcode">Barcode (read-only)</label>
              <Input id="barcode" name="barcode" value={formData.barcode} disabled />
            </div>
            <div>
              <label className={labelClassName} htmlFor="shortDescription">Short description</label>
              <Input id="shortDescription" name="shortDescription" value={formData.shortDescription} onChange={handleChange} />
            </div>
            <div>
              <label className={labelClassName} htmlFor="productType">Product type *</label>
              <select id="productType" name="productType" value={formData.productType} onChange={handleChange} className={fieldClassName} required>
                <option value="physical">Physical</option>
                <option value="service">Service</option>
                <option value="digital">Digital</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClassName} htmlFor="description">Description</label>
              <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleChange} className={fieldClassName} />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">Classification and measurement</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="categoryId">Category *</label>
              <select id="categoryId" name="categoryId" value={formData.categoryId} onChange={handleChange} className={fieldClassName} required>
                <option value="">Select a category</option>
                {categoryOptions.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.categoryName || item.name || "Unnamed category"}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="brandId">Brand</label>
              <select id="brandId" name="brandId" value={formData.brandId} onChange={handleChange} className={fieldClassName}>
                <option value="">No brand</option>
                {brandOptions.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.brandName || item.name || "Unnamed brand"}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="unit">Unit *</label>
              <Input id="unit" name="unit" value={formData.unit} onChange={handleChange} required />
            </div>
            <div>
              <label className={labelClassName} htmlFor="unitConversion">Unit conversion (read-only)</label>
              <Input id="unitConversion" name="unitConversion" value={formData.unitConversion} disabled />
            </div>
            <div>
              <label className={labelClassName} htmlFor="status">Status</label>
              <select id="status" name="status" value={formData.status} onChange={handleChange} className={fieldClassName}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">Pricing and tax</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClassName} htmlFor="purchasePrice">Purchase price</label>
              <Input id="purchasePrice" name="purchasePrice" inputMode="decimal" value={formData.purchasePrice} onChange={handleChange} />
            </div>
            <div>
              <label className={labelClassName} htmlFor="sellingPrice">Selling price *</label>
              <Input id="sellingPrice" name="sellingPrice" inputMode="decimal" value={formData.sellingPrice} onChange={handleChange} required />
            </div>
            <div>
              <label className={labelClassName} htmlFor="minimumSellingPrice">Minimum selling price</label>
              <Input id="minimumSellingPrice" name="minimumSellingPrice" inputMode="decimal" value={formData.minimumSellingPrice} onChange={handleChange} />
            </div>
            <div>
              <label className={labelClassName} htmlFor="taxType">Tax type</label>
              <select id="taxType" name="taxType" value={formData.taxType} onChange={handleChange} className={fieldClassName}>
                <option value="none">None</option>
                <option value="inclusive">Inclusive</option>
                <option value="exclusive">Exclusive</option>
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="taxRate">Tax rate (%)</label>
              <Input id="taxRate" name="taxRate" inputMode="decimal" value={formData.taxRate} onChange={handleChange} />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">Inventory</h2>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input type="checkbox" name="trackInventory" checked={Boolean(formData.trackInventory)} onChange={handleChange} className="h-4 w-4 rounded border-slate-300" />
            Track inventory for this product
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClassName} htmlFor="minimumStockLevel">Minimum stock level</label>
              <Input id="minimumStockLevel" name="minimumStockLevel" inputMode="decimal" value={formData.minimumStockLevel} onChange={handleChange} />
            </div>
            <div>
              <label className={labelClassName} htmlFor="maximumStockLevel">Maximum stock level</label>
              <Input id="maximumStockLevel" name="maximumStockLevel" inputMode="decimal" value={formData.maximumStockLevel} onChange={handleChange} />
            </div>
            <div>
              <label className={labelClassName} htmlFor="reorderLevel">Reorder level</label>
              <Input id="reorderLevel" name="reorderLevel" inputMode="decimal" value={formData.reorderLevel} onChange={handleChange} />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">Images</h2>
          <div>
            <label className={labelClassName} htmlFor="images">Image URLs</label>
            <textarea id="images" name="images" rows={4} value={formData.images} onChange={handleChange} className={fieldClassName} placeholder="Enter one image URL per line" />
            <p className="mt-1 text-xs text-slate-500">Enter one URL per line. Comma-separated URLs are also accepted.</p>
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onBack} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving changes..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProductEditPage;