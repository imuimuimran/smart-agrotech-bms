// src/pages/products/ProductCreatePage.jsx

import { useEffect, useMemo, useState } from "react";
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
  purchasePrice: "",
  sellingPrice: "",
  minimumSellingPrice: "",
  taxType: "none",
  taxRate: "0",
  trackInventory: true,
  minimumStockLevel: "0",
  maximumStockLevel: "1000",
  reorderLevel: "10",
  images: "",
  status: "active",
};

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
    return data.errors.map((item) => item.message || item.msg || String(item)).join(" ");
  }
  if (data?.errors && typeof data.errors === "object") {
    return Object.values(data.errors).flat().join(" ");
  }
  return data?.message || error?.message || "Product creation failed. Please try again.";
}

function numberValue(value, label, { min = 0, required = false } = {}) {
  if (value === "" && !required) return 0;
  if (value === "" && required) throw new Error(`${label} is required.`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) {
    throw new Error(`${label} must be a valid number greater than or equal to ${min}.`);
  }
  return number;
}

function FieldError({ children }) {
  return children ? <p className="mt-1 text-sm text-red-600" role="alert">{children}</p> : null;
}

export function ProductCreatePage({ onBack, onSuccess }) {
  const [formData, setFormData] = useState({ ...INITIAL_FORM_STATE });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [apiError, setApiError] = useState("");

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
        if (active) {
          setCategories(unwrapList(categoryResult));
          setBrands(unwrapList(brandResult));
        }
      } catch (error) {
        if (active) setLookupError(getErrorMessage(error));
      } finally {
        if (active) setIsLoadingLookups(false);
      }
    }
    loadLookups();
    return () => { active = false; };
  }, []);

  const categoryOptions = useMemo(
    () => categories.filter((item) => item?._id || item?.id),
    [categories],
  );
  const brandOptions = useMemo(
    () => brands.filter((item) => item?._id || item?.id),
    [brands],
  );

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setValidationError("");
    setApiError("");
  }

  function validateAndBuildPayload() {
    if (!formData.productName.trim()) throw new Error("Product name is required.");
    if (!formData.categoryId) throw new Error("Please select a category.");
    if (!formData.productType) throw new Error("Please select a product type.");
    if (!formData.unit.trim()) throw new Error("Unit is required.");

    const unitConversion = numberValue(formData.unitConversion, "Unit conversion", { min: 0.000001, required: true });
    const purchasePrice = numberValue(formData.purchasePrice, "Purchase price");
    const sellingPrice = numberValue(formData.sellingPrice, "Selling price", { required: true });
    const minimumSellingPrice = numberValue(formData.minimumSellingPrice, "Minimum selling price");
    const taxRate = numberValue(formData.taxRate, "Tax rate");
    const minimumStockLevel = numberValue(formData.minimumStockLevel, "Minimum stock level");
    const maximumStockLevel = numberValue(formData.maximumStockLevel, "Maximum stock level");
    const reorderLevel = numberValue(formData.reorderLevel, "Reorder level");

    if (sellingPrice < minimumSellingPrice) {
      throw new Error("Selling price must be greater than or equal to minimum selling price.");
    }
    if (maximumStockLevel < minimumStockLevel) {
      throw new Error("Maximum stock level must be greater than or equal to minimum stock level.");
    }

    const images = formData.images
      .split(/\n|,/)
      .map((imageUrl) => imageUrl.trim())
      .filter(Boolean);

    return {
      productName: formData.productName.trim(),
      ...(formData.productCode.trim() ? { productCode: formData.productCode.trim() } : {}),
      ...(formData.sku.trim() ? { sku: formData.sku.trim() } : {}),
      ...(formData.barcode.trim() ? { barcode: formData.barcode.trim() } : {}),
      categoryId: formData.categoryId,
      ...(formData.brandId ? { brandId: formData.brandId } : {}),
      productType: formData.productType,
      ...(formData.shortDescription.trim() ? { shortDescription: formData.shortDescription.trim() } : {}),
      ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
      unit: formData.unit.trim(),
      unitConversion,
      pricing: { purchasePrice, sellingPrice, minimumSellingPrice },
      tax: { taxType: formData.taxType, taxRate },
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
    let payload;
    try {
      payload = validateAndBuildPayload();
    } catch (error) {
      setValidationError(error.message);
      return;
    }

    setIsSubmitting(true);
    try {
      await ProductService.createProduct(payload);
      if (typeof onSuccess === "function") await onSuccess();
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingLookups) {
    return <div className="flex justify-center py-16"><LoadingSpinner label="Loading categories and brands..." /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Product</h1>
          <p className="mt-1 text-sm text-gray-600">Enter product details and inventory configuration.</p>
        </div>
        <Button type="button" variant="secondary" onClick={onBack} disabled={isSubmitting}>Cancel</Button>
      </header>

      {lookupError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          Could not load category/brand options: {lookupError}
          <p className="mt-1">Check the existing LookupService endpoints and try again.</p>
        </div>
      )}
      {validationError && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">{validationError}</div>}
      {apiError && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{apiError}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">Basic information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Product name *" id="productName" name="productName" value={formData.productName} onChange={handleChange} required />
            <Input label="Product code" id="productCode" name="productCode" value={formData.productCode} onChange={handleChange} />
            <Input label="SKU" id="sku" name="sku" value={formData.sku} onChange={handleChange} />
            <Input label="Barcode" id="barcode" name="barcode" value={formData.barcode} onChange={handleChange} />
            <Input label="Short description" id="shortDescription" name="shortDescription" value={formData.shortDescription} onChange={handleChange} />
            <div className="sm:col-span-2">
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">Classification and measurement</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">Category *</label>
              <select id="categoryId" name="categoryId" value={formData.categoryId} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="">Select category</option>
                {categoryOptions.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.categoryName || item.name || item.title || "Unnamed category"}</option>)}
              </select>
              {categoryOptions.length === 0 && <FieldError>No categories were returned by the category service.</FieldError>}
            </div>
            <div>
              <label htmlFor="brandId" className="mb-1 block text-sm font-medium text-slate-700">Brand</label>
              <select id="brandId" name="brandId" value={formData.brandId} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="">No brand</option>
                {brandOptions.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.brandName || item.name || item.title || "Unnamed brand"}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="productType" className="mb-1 block text-sm font-medium text-slate-700">Product type *</label>
              <select id="productType" name="productType" value={formData.productType} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="physical">Physical</option><option value="service">Service</option><option value="digital">Digital</option>
              </select>
            </div>
            <Input label="Unit *" id="unit" name="unit" value={formData.unit} onChange={handleChange} required />
            <Input label="Unit conversion" id="unitConversion" name="unitConversion" type="number" min="0.000001" step="any" value={formData.unitConversion} onChange={handleChange} required />
            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="active">Active</option><option value="inactive">Inactive</option><option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">Pricing and tax</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Purchase price" id="purchasePrice" name="purchasePrice" type="number" min="0" step="any" value={formData.purchasePrice} onChange={handleChange} />
            <Input label="Selling price *" id="sellingPrice" name="sellingPrice" type="number" min="0" step="any" value={formData.sellingPrice} onChange={handleChange} required />
            <Input label="Minimum selling price" id="minimumSellingPrice" name="minimumSellingPrice" type="number" min="0" step="any" value={formData.minimumSellingPrice} onChange={handleChange} />
            <div>
              <label htmlFor="taxType" className="mb-1 block text-sm font-medium text-slate-700">Tax type</label>
              <select id="taxType" name="taxType" value={formData.taxType} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="none">None</option><option value="inclusive">Inclusive</option><option value="exclusive">Exclusive</option>
              </select>
            </div>
            <Input label="Tax rate (%)" id="taxRate" name="taxRate" type="number" min="0" step="any" value={formData.taxRate} onChange={handleChange} />
          </div>
        </Card>

        <Card className="space-y-4 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">Inventory configuration</h2>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" name="trackInventory" checked={formData.trackInventory} onChange={handleChange} className="h-4 w-4" />
            Track inventory for this product
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Minimum stock level" id="minimumStockLevel" name="minimumStockLevel" type="number" min="0" step="any" value={formData.minimumStockLevel} onChange={handleChange} />
            <Input label="Maximum stock level" id="maximumStockLevel" name="maximumStockLevel" type="number" min="0" step="any" value={formData.maximumStockLevel} onChange={handleChange} />
            <Input label="Reorder level" id="reorderLevel" name="reorderLevel" type="number" min="0" step="any" value={formData.reorderLevel} onChange={handleChange} />
          </div>
        </Card>

        <Card className="space-y-3 bg-white">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold">Images</h2>
          <label htmlFor="images" className="block text-sm font-medium text-slate-700">Image URLs</label>
          <textarea id="images" name="images" rows={3} value={formData.images} onChange={handleChange} placeholder="Enter one image URL per line (or comma-separated)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <p className="text-xs text-slate-500">URLs are sent as an array. Upload support should be connected separately if your backend expects uploaded files instead of URLs.</p>
        </Card>

        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onBack} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || Boolean(lookupError) || categoryOptions.length === 0}>
            {isSubmitting ? "Creating product..." : "Create product"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProductCreatePage;
