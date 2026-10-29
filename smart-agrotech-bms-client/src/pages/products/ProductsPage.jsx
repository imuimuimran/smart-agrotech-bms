// src/pages/products/ProductsPage.jsx

import { useCallback, useEffect, useState } from "react";
import { ProductService } from "../../services/productService";
import { LookupService } from "../../services/lookupService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ProductDetailsPage } from "./ProductDetailsPage";
import { ProductCreatePage } from "./ProductCreatePage";
import { ProductEditPage } from "./ProductEditPage";
import { useAuth } from "../../hooks/useAuth";

const PAGE_SIZE = 20;

const INITIAL_FILTERS = {
  search: "",
  categoryId: "",
  brandId: "",
  productType: "",
  status: "",
  minPrice: "",
  maxPrice: "",
};

const INITIAL_PAGINATION = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

function unwrapList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.results)) return result.results;
  return [];
}

function getProductId(product) {
  return product?._id || product?.id || product?.productId || "";
}

function getSellingPrice(product) {
  return product?.pricing?.sellingPrice ?? product?.sellingPrice ?? product?.price;
}

function getRole(user, explicitRole) {
  const rawRole =
    explicitRole ??
    user?.role?.name ??
    user?.role ??
    user?.user?.role?.name ??
    user?.user?.role ??
    user?.userRole ??
    user?.roleName ??
    "";
  return String(rawRole).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function formatPrice(value) {
  if (value === undefined || value === null || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "—";
}


function getProductImageUrl(product) {
  const images = Array.isArray(product?.images)
    ? product.images
    : [];

  // Prefer the image marked as primary.
  const primaryImage = images.find(
    (image) =>
      typeof image === "object" && image?.isPrimary === true
  );

  const firstImage = primaryImage || images[0];

  let url =
    typeof firstImage === "string"
      ? firstImage
      : firstImage?.url ||
      firstImage?.imageUrl ||
      firstImage?.src ||
      "";

  // Support Markdown links such as [Image](https://example.com/image.jpg).
  const markdownMatch =
    typeof url === "string"
      ? url.match(/^\[[^\]]*\]\((https?:\/\/[^)]+)\)$/)
      : null;

  if (markdownMatch) {
    url = markdownMatch[1];
  }

  return typeof url === "string" ? url.trim() : "";
}



export function ProductsPage({
  currentUser,
  user,
  userRole,
  canCreateProducts: explicitCreatePermission,
}) {
  const { user: authenticatedUser } = useAuth();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [activeParams, setActiveParams] = useState({ ...INITIAL_FILTERS });
  const [pagination, setPagination] = useState({ ...INITIAL_PAGINATION });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const effectiveUser = currentUser ?? user ?? authenticatedUser;
  const role = getRole(effectiveUser, userRole);
  const roleCanCreate = ["admin", "super_admin", "inventory_manager", "manager"].includes(role);
  const canCreate =
    typeof explicitCreatePermission === "boolean"
      ? explicitCreatePermission
      : roleCanCreate;
  // Only ADMIN and MANAGER (and the supported super-admin alias) may enter edit mode.
  const canUpdate = ["admin", "super_admin", "manager"].includes(role);

  const canContinueProduct = role === "admin";
  // Deletion is restricted to ADMIN only.
  const canDelete = role === "admin";

  const loadProducts = useCallback(async (pageNumber = 1, searchFilters = INITIAL_FILTERS) => {
    setIsLoading(true);
    setError("");

    try {
      const params = { page: pageNumber, limit: PAGE_SIZE };
      const search = (searchFilters.search || "").trim();

      if (search) params.search = search;
      if (searchFilters.categoryId) params.categoryId = searchFilters.categoryId;
      if (searchFilters.brandId) params.brandId = searchFilters.brandId;
      if (searchFilters.productType) params.productType = searchFilters.productType;
      if (searchFilters.status) params.status = searchFilters.status;
      if (searchFilters.minPrice !== "") params.minPrice = Number(searchFilters.minPrice);
      if (searchFilters.maxPrice !== "") params.maxPrice = Number(searchFilters.maxPrice);

      const response = await ProductService.getProducts(params);
      const responseData = response?.data ?? response;
      const items = unwrapList(responseData);


      setProducts(items);
      const pageInfo =
        response?.pagination ??
        response?.data?.pagination ??
        responseData?.pagination ??
        {};

      const totalPages = Number(
        pageInfo.totalPages ?? Math.ceil(Number(pageInfo.total ?? items.length) / PAGE_SIZE),
      );

      setPagination({
        page: Number(pageInfo.page ?? pageNumber),
        limit: Number(pageInfo.limit ?? PAGE_SIZE),
        total: Number(pageInfo.total ?? items.length),
        totalPages,
        hasNextPage: Boolean(pageInfo.hasNextPage ?? pageNumber < totalPages),
        hasPreviousPage: Boolean(pageInfo.hasPreviousPage ?? pageNumber > 1),
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load products."));
      setProducts([]);
      setPagination({ ...INITIAL_PAGINATION, page: pageNumber });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      await loadProducts(1, activeParams);
    }
    fetchData();
  }, [loadProducts, activeParams]);

  useEffect(() => {
    let active = true;

    Promise.all([LookupService.getCategories(), LookupService.getBrands()])
      .then(([categoryResult, brandResult]) => {
        if (!active) return;
        setCategories(unwrapList(categoryResult?.data ?? categoryResult));
        setBrands(unwrapList(brandResult?.data ?? brandResult));
      })
      .catch((lookupError) => {
        if (active) {
          // Filters remain usable even if lookup lists cannot be loaded.
          console.error("Failed to load product filter options:", lookupError);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleApplyFilters(event) {
    event.preventDefault();

    const min = filters.minPrice === "" ? null : Number(filters.minPrice);
    const max = filters.maxPrice === "" ? null : Number(filters.maxPrice);

    if (
      (min !== null && (!Number.isFinite(min) || min < 0)) ||
      (max !== null && (!Number.isFinite(max) || max < 0))
    ) {
      setError("Prices must be valid non-negative numbers.");
      return;
    }

    if (min !== null && max !== null && min > max) {
      setError("Minimum price cannot exceed maximum price.");
      return;
    }

    setError("");
    setActiveParams({ ...filters });
  }

  function handleResetFilters() {
    setFilters({ ...INITIAL_FILTERS });
    setActiveParams({ ...INITIAL_FILTERS });
    setError("");
  }

  async function handleCreated() {
    setIsCreating(false);
    setSelectedProductId(null);
    setEditingProductId(null);
    await loadProducts(1, activeParams);
  }

  async function handleUpdated() {
    // Return to the edited product's details when possible.
    const detailsId = selectedProductId || editingProductId;
    setEditingProductId(null);
    if (detailsId) setSelectedProductId(detailsId);
    await loadProducts(pagination.page, activeParams);
  }

  async function handleDeleteProduct() {
    if (!canDelete || !deleteTarget?._id || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setActionMessage("");
    setActionError("");

    try {
      await ProductService.deleteProduct(deleteTarget._id);

      const deletedName = deleteTarget.productName || "Product";

      setDeleteTarget(null);
      setActionMessage(
        `${deletedName} was deleted successfully.`
      );

      // Refresh the active list using the current filters and page.
      await loadProducts(pagination.page, activeParams);
    } catch (error) {
      // Preserve the backend's conflict/authorization message.
      setActionError(
        getProductActionError(
          error,
          "Unable to delete this product."
        )
      );
    } finally {
      setIsDeleting(false);
    }
  }

  // async function handleDiscontinueProduct(product) {
  //   const productId = product?._id;

  //   if (!canUpdate || !productId || updatingStatusId) {
  //     return;
  //   }

  //   if (product.status === "discontinued") {
  //     return;
  //   }

  //   const confirmed = window.confirm(
  //     `Discontinue "${product.productName}"?\n\n` +
  //     "The product record will remain in the system, but its status will change to discontinued."
  //   );

  //   if (!confirmed) return;

  //   setUpdatingStatusId(productId);
  //   setActionMessage("");
  //   setActionError("");

  //   try {
  //     await ProductService.updateProduct(productId, {
  //       status: "discontinued",
  //     });

  //     setActionMessage(
  //       `${product.productName} was discontinued successfully.`
  //     );

  //     await loadProducts(pagination.page, activeParams);
  //   } catch (error) {
  //     setActionError(
  //       getProductActionError(
  //         error,
  //         "Unable to discontinue this product."
  //       )
  //     );
  //   } finally {
  //     setUpdatingStatusId(null);
  //   }
  // }

  async function handleDiscontinueProduct(product) {
    const productId = getProductId(product);

    if (!productId || updatingStatusId) {
      return;
    }

    const isDiscontinued = product.status === "discontinued";

    // Only admins may continue a discontinued product.
    if (isDiscontinued ? !canContinueProduct : !canUpdate) {
      return;
    }

    const nextStatus = isDiscontinued ? "active" : "discontinued";
    const actionLabel = isDiscontinued ? "Continue" : "Discontinue";

    const confirmed = window.confirm(
      `${actionLabel} "${product.productName}"?\n\n` +
      `The product status will change to ${nextStatus}.`
    );

    if (!confirmed) return;

    setUpdatingStatusId(productId);
    setActionMessage("");
    setActionError("");

    try {
      await ProductService.updateProduct(productId, {
        status: nextStatus,
      });

      setActionMessage(
        `${product.productName} was ${isDiscontinued ? "continued" : "discontinued"} successfully.`
      );

      await loadProducts(pagination.page, activeParams);
    } catch (error) {
      setActionError(
        getProductActionError(
          error,
          `Unable to ${actionLabel.toLowerCase()} this product.`
        )
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  function openDetails(product) {
    const id = getProductId(product);
    if (id) setSelectedProductId(id);
  }

  function openEdit(id) {
    // Defense-in-depth UI gate; backend authorization remains authoritative.
    if (!canUpdate || !id) return;
    setEditingProductId(id);
  }

  function returnFromEdit() {
    setEditingProductId(null);
  }

  function getProductActionError(error, fallback) {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.error?.message ||
      error?.message ||
      fallback
    );
  }

  if (editingProductId) {
    if (!canUpdate) {
      // Prevent an unauthorized user from entering edit mode, even if state is triggered unexpectedly.
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            You do not have permission to edit products.
          </div>
          <Button type="button" variant="secondary" onClick={returnFromEdit}>
            Back
          </Button>
        </div>
      );
    }

    return (
      <ProductEditPage
        productId={editingProductId}
        onBack={returnFromEdit}
        onSuccess={handleUpdated}
      />
    );
  }

  if (selectedProductId) {
    return (
      <ProductDetailsPage
        productId={selectedProductId}
        onBack={() => setSelectedProductId(null)}
        onEdit={openEdit}
      />
    );
  }

  if (isCreating) {
    return (
      <ProductCreatePage
        onBack={() => setIsCreating(false)}
        onSuccess={handleCreated}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-600">View and manage your product catalog.</p>
        </div>
        {canCreate && (
          <Button type="button" onClick={() => setIsCreating(true)}>
            Create product
          </Button>
        )}
      </header>


      {actionMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {actionMessage}
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {actionError}
        </div>
      )}


      <Card className="bg-white">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Search products"
              id="search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Name, SKU, code, barcode"
            />

            <div>
              <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={filters.categoryId}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">All categories</option>
                {categories.map((item) => {
                  const id = item?._id || item?.id;
                  if (!id) return null;
                  return (
                    <option key={id} value={id}>
                      {item.categoryName || item.name || item.title || "Unnamed category"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label htmlFor="brandId" className="mb-1 block text-sm font-medium text-slate-700">
                Brand
              </label>
              <select
                id="brandId"
                name="brandId"
                value={filters.brandId}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">All brands</option>
                {brands.map((item) => {
                  const id = item?._id || item?.id;
                  if (!id) return null;
                  return (
                    <option key={id} value={id}>
                      {item.brandName || item.name || item.title || "Unnamed brand"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label htmlFor="productType" className="mb-1 block text-sm font-medium text-slate-700">
                Product type
              </label>
              <select
                id="productType"
                name="productType"
                value={filters.productType}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">All types</option>
                <option value="physical">Physical</option>
                <option value="service">Service</option>
                <option value="digital">Digital</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>

            <Input
              label="Minimum price"
              id="minPrice"
              name="minPrice"
              inputType="number"
              value={filters.minPrice}
              onChange={handleFilterChange}
              placeholder="0"
            />
            <Input
              label="Maximum price"
              id="maxPrice"
              name="maxPrice"
              inputType="number"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              placeholder="No maximum"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">Apply filters</Button>
            <Button type="button" variant="secondary" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <Card className="overflow-hidden bg-white p-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner label="Loading products..." />
          </div>
        ) : products.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-gray-900">No products found</h2>
            <p className="mt-1 text-sm text-gray-600">
              Try changing your search terms or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code / SKU</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Selling price</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {products.map((product, index) => {
                  const id = getProductId(product);
                  const categoryValue = product?.categoryId ?? product?.category;
                  const category =
                    typeof categoryValue === "object"
                      ? categoryValue?.categoryName || categoryValue?.name || categoryValue?.title || "—"
                      : categoryValue || "—";
                  const price = getSellingPrice(product);
                  const status = String(product?.status || "unknown");
                  const statusClass =
                    status.toLowerCase() === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : status.toLowerCase() === "inactive"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600";

                  return (
                    <tr key={id || `${product?.productName || "product"}-${index}`} className="hover:bg-slate-50">

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {getProductImageUrl(product) ? (
                            <img
                              src={getProductImageUrl(product)}
                              alt={product.productName || "Product image"}
                              className="h-14 w-14 shrink-0 rounded-md border border-gray-200 bg-white object-contain"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-400">
                              No image
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="font-medium text-gray-900">
                              {product.productName || product.name || "Unnamed Product"}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {product?.productType || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                        <div>{product?.productCode || "—"}</div>
                        {product?.sku && <div className="mt-1 text-xs text-slate-500">{product.sku}</div>}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{category}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-slate-900">
                        {formatPrice(price)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass}`}>
                          {status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openDetails(product)}
                            disabled={!id}
                          >
                            View
                          </Button>
                          {canUpdate && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => openEdit(id)}
                              disabled={!id}
                            >
                              Edit
                            </Button>
                          )}

                          {/* {canUpdate &&
                            product.status !== "discontinued" && (
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={Boolean(updatingStatusId)}
                                onClick={() => handleDiscontinueProduct(product)}
                              >
                                {updatingStatusId === product._id
                                  ? "Updating..."
                                  : "Discontinue"}
                              </Button>
                            )} */}

                          {(product.status === "discontinued"
                            ? canContinueProduct
                            : canUpdate) && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={Boolean(updatingStatusId)}
                                onClick={() => handleDiscontinueProduct(product)}
                              >
                                {updatingStatusId === getProductId(product)
                                  ? "Updating..."
                                  : product.status === "discontinued"
                                    ? "Continue"
                                    : "Discontinue"}
                              </Button>
                            )}

                          {canDelete && (
                            <Button
                              type="button"
                              variant="danger"
                              onClick={() => {
                                setActionMessage("");
                                setActionError("");
                                setDeleteTarget(product);
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>


                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>



            {canDelete && deleteTarget && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={(event) => {
                  if (event.target === event.currentTarget && !isDeleting) {
                    setDeleteTarget(null);
                  }
                }}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="delete-product-title"
                  className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
                >
                  <h2
                    id="delete-product-title"
                    className="text-lg font-semibold text-gray-900"
                  >
                    Delete product?
                  </h2>

                  <p className="mt-3 text-sm text-gray-700">
                    You are about to soft-delete{" "}
                    <strong>{deleteTarget.productName}</strong>.
                  </p>

                  <p className="mt-2 text-sm text-gray-600">
                    This marks the product as deleted; it does not permanently
                    remove the database record. Deletion may be blocked if the
                    product has business history. If so, discontinue the product
                    instead.
                  </p>

                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isDeleting}
                      onClick={() => setDeleteTarget(null)}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      disabled={isDeleting}
                      onClick={handleDeleteProduct}
                    >
                      {isDeleting ? "Deleting..." : "Confirm delete"}
                    </Button>
                  </div>
                </section>
              </div>
            )}




          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Page {pagination.page}
          {pagination.totalPages ? ` of ${pagination.totalPages}` : ""} · {pagination.total} product(s)
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading || !pagination.hasPreviousPage}
            onClick={() => loadProducts(Math.max(1, pagination.page - 1), activeParams)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading || !pagination.hasNextPage}
            onClick={() => loadProducts(pagination.page + 1, activeParams)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;

