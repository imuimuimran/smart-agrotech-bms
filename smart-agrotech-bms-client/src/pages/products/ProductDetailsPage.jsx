// src/pages/products/ProductDetailsPage.jsx

import { SquarePen } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProductService } from "../../services/productService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../hooks/useAuth";

const display = (value, fallback = "—") =>
  value === undefined || value === null || value === "" ? fallback : String(value);

const money = (value) => {
  if (value === undefined || value === null || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString("en-BD")} BDT` : "—";
};

const date = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("en-BD");
};

const statusVariant = (status) => ({
  active: "success",
  inactive: "warning",
  discontinued: "danger",
}[String(status || "").toLowerCase()] || "neutral");

const relatedName = (value, key) =>
  value && typeof value === "object"
    ? value[key] || value.name || value.title || "—"
    : value || "—";

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 wrap-break-words text-sm text-slate-900">{children ?? "—"}</dd>
    </div>
  );
}

// export function ProductDetailsPage({ productId, onBack, onEdit }) {
export function ProductDetailsPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user: authenticatedUser } = useAuth();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Support the role shapes used by the auth API while keeping the permission
  // check local to the UI. The backend must still enforce update authorization.
  const rawRole =
    authenticatedUser?.role?.name ??
    authenticatedUser?.role ??
    authenticatedUser?.user?.role?.name ??
    authenticatedUser?.user?.role ??
    authenticatedUser?.userRole ??
    authenticatedUser?.roleName ??
    "";
  const role = String(rawRole).trim().toLowerCase().replace(/[\s-]+/g, "_");
  const canUpdate = ["admin", "super_admin", "manager"].includes(role);

  useEffect(() => {
    let cancelled = false;

    async function fetchProduct() {
      if (!productId) {
        setError("A product ID was not provided.");
        setProduct(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");
      setProduct(null);

      try {
        // productId must be the MongoDB _id, not publicId.
        // The ID passed here must be the MongoDB _id.
        const response = await ProductService.getProductById(productId);
        const data = response?.data?.data ?? response?.data ?? null;
        if (cancelled) return;

        if (!data || typeof data !== "object" || Array.isArray(data)) {
          setError("The requested product could not be found.");
          setProduct(null);
        } else {
          setProduct(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load product details."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchProduct();
    return () => { cancelled = true; };
  }, [productId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner label="Loading product details..." />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error || "The requested product could not be found."}
        </div>
        <Button 
          type="button" 
          variant="secondary" 
          // onClick={onBack}
          onClick={() => navigate("/products")}
        >
          Back to Products
        </Button>
      </div>
    );
  }

  const pricing = product.pricing || {};
  const tax = product.tax || {};
  const inventory = product.inventoryConfig || {};
  const imageValues = Array.isArray(product.images)
    ? product.images
    : product.image ? [product.image] : [];
  const images = imageValues.map((item) =>
    typeof item === "string" ? item : item?.url || item?.imageUrl || item?.src || ""
  ).filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {display(product.productName, "Unnamed Product")}
            </h1>
            <Badge variant={statusVariant(product.status)} className="capitalize">
              {display(product.status, "Unknown")}
            </Badge>
          </div>
          <p className="mt-1 break-all font-mono text-sm font-semibold text-emerald-700">
            Public ID: {display(product.publicId)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* {canUpdate && typeof onEdit === "function" && (
           */}
          {canUpdate && (
            <Button
              type="button"
              variant="primary"
              // onClick={() => onEdit(product._id || productId)}
              onClick={() => navigate(`/products/${encodeURIComponent(product._id || productId)}/edit`)}
            >
              <SquarePen className="w-4 h-4 mr-2" /> <span>Edit Product</span>
            </Button>
          )}
          <Button 
            type="button" 
            variant="secondary" 
            // onClick={onBack}
            onClick={() => navigate("/products")}
          >
            &larr; Back to Products
          </Button>
        </div>
      </header>

      {images.length > 0 && (
        <Card className="bg-white">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Product Images</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((src, index) => (
              <img key={`${src}-${index}`} src={src}
                alt={`${product.productName || "Product"} ${index + 1}`}
                loading="lazy"
                className="h-40 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain" />
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-4 bg-white">
            <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold text-slate-900">Product Information</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Product Name">{display(product.productName)}</Field>
              <Field label="MongoDB ID">{display(product._id)}</Field>
              <Field label="Public ID">{display(product.publicId)}</Field>
              <Field label="Product Code">{display(product.productCode)}</Field>
              <Field label="SKU">{display(product.sku)}</Field>
              <Field label="Barcode">{display(product.barcode)}</Field>
              <Field label="Category">{relatedName(product.categoryId ?? product.category, "categoryName")}</Field>
              <Field label="Brand">{relatedName(product.brandId ?? product.brand, "brandName")}</Field>
              <Field label="Product Type">{display(product.productType)}</Field>
              <Field label="Unit">{display(product.unit)}</Field>
              <Field label="Status">{display(product.status, "Unknown")}</Field>
            </dl>
          </Card>

          <Card className="space-y-4 bg-white">
            <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold text-slate-900">Description</h2>
            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-500">Short Description</h3>
              <p className="whitespace-pre-line rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                {display(product.shortDescription, "No short description available.")}
              </p>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-500">Detailed Description</h3>
              <p className="whitespace-pre-line rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                {display(product.description, "No description available.")}
              </p>
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="space-y-4 bg-white">
            <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold text-slate-900">Pricing and Tax</h2>
            <dl className="space-y-3">
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2">
                <dt className="text-sm text-slate-500">Purchase Price</dt>
                <dd className="text-right text-sm font-semibold">{money(pricing.purchasePrice)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2">
                <dt className="text-sm text-slate-500">Selling Price</dt>
                <dd className="text-right text-sm font-bold text-emerald-800">{money(pricing.sellingPrice)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2">
                <dt className="text-sm text-slate-500">Minimum Selling Price</dt>
                <dd className="text-right text-sm font-semibold">{money(pricing.minimumSellingPrice)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-slate-500">Tax Type</dt>
                <dd className="text-right text-sm">{display(tax.taxType, "None")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-slate-500">Tax Rate</dt>
                <dd className="text-right text-sm font-semibold">
                  {tax.taxRate === undefined || tax.taxRate === null || tax.taxRate === "" ? "—" : `${tax.taxRate}%`}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="space-y-4 bg-white">
            <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold text-slate-900">Inventory</h2>
            <dl className="space-y-3">
              <div className="flex justify-between gap-4 rounded-lg bg-emerald-50 p-3">
                <dt className="text-sm font-medium text-slate-700">Current Stock</dt>
                <dd className="text-right text-base font-bold text-emerald-800">
                  {display(product.currentStock, "0")} {display(product.unit, "Units")}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-slate-500">Minimum Stock Level</dt>
                <dd className="text-sm font-semibold">{display(inventory.minimumStockLevel)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-slate-500">Maximum Stock Level</dt>
                <dd className="text-sm font-semibold">{display(inventory.maximumStockLevel)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-slate-500">Reorder Level</dt>
                <dd className="text-sm font-semibold">{display(inventory.reorderLevel)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="space-y-3 bg-white">
            <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold text-slate-900">Audit Information</h2>
            <Field label="Created At">{date(product.createdAt)}</Field>
            <Field label="Last Updated">{date(product.updatedAt)}</Field>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default ProductDetailsPage;



