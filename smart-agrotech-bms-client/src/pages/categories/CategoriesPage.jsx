// src/pages/categories/categoriesPage.jsx

import { Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { CategoryService } from "../../services/categoryService";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const PAGE_SIZE = 10;

const INITIAL_META = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Failed to load categories. Please try again."
  );
}

function getParentCategory(category) {
  const parent = category?.parentCategory;

  if (!parent) return "Root category";

  // Handle a populated parent-category object.
  if (typeof parent === "object") {
    return (
      parent.categoryName ||
      parent.name ||
      parent.publicId ||
      parent._id ||
      "Parent category"
    );
  }

  // Handle a parent ID if the API returns an unpopulated reference.
  return String(parent);
}

function getStatusVariant(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "success";
    case "inactive":
      return "warning";
    case "deleted":
      return "danger";
    default:
      return "neutral";
  }
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

export function CategoriesPage() {
  const { user } = useAuth();
  const location = useLocation();

  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [meta, setMeta] = useState({ ...INITIAL_META });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const rawRole =
    user?.role?.name ??
    user?.role ??
    user?.user?.role?.name ??
    user?.user?.role ??
    user?.userRole ??
    user?.roleName ??
    "";

  const role = String(rawRole)
    .trim()
    .toLowerCase()
    .replace(/[\\s-]+/g, "_");

  const canCreate = role === "admin";

  const canEdit = role === "admin";

  const canDeleteCategory = role === "admin";

  const loadCategories = useCallback(
    async (page = 1, search = activeSearch) => {
      setIsLoading(true);
      setError("");

      try {
        const params = {
          page,
          limit: PAGE_SIZE,
        };

        // The backend searches category name, code, and description.
        if (search.trim()) {
          params.search = search.trim();
        }

        const response = await CategoryService.getCategories(params);

        // The verified Categories API returns the list in data
        // and pagination details in meta.
        if (!Array.isArray(response?.data)) {
          throw new Error(
            "The Categories API returned an unexpected response format."
          );
        }

        const items = response.data;
        const responseMeta = response.meta || {};

        setCategories(items);
        setMeta({
          page: Number(responseMeta.page ?? page),
          limit: Number(responseMeta.limit ?? PAGE_SIZE),
          total: Number(responseMeta.total ?? items.length),
          totalPages: Number(responseMeta.totalPages ?? 0),
        });
      } catch (loadError) {
        setCategories([]);
        setMeta({ ...INITIAL_META, page });
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    },
    [activeSearch]
  );

  useEffect(() => {
    async function fetchData() {
      await loadCategories(1, activeSearch);
    }
    fetchData();
  }, [loadCategories, activeSearch]);

  function handleSearchSubmit(event) {
    event.preventDefault();

    const nextSearch = searchInput.trim();

    // Avoid a duplicate state transition when the search is unchanged.
    if (nextSearch === activeSearch) {
      loadCategories(1, nextSearch);
      return;
    }

    setActiveSearch(nextSearch);
  }

  function clearSearch() {
    setSearchInput("");
    setActiveSearch("");
  }

  const hasPreviousPage = meta.page > 1;
  const hasNextPage = meta.page < meta.totalPages;

  async function handleDeleteCategory(category) {
    if (
      !canDeleteCategory ||
      !category?.publicId ||
      deletingId !== null
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Delete category "${category.categoryName}"? This action may affect related records.`
    );

    if (!confirmed) return;

    setDeletingId(category.publicId);
    setActionError("");
    setActionSuccess("");

    try {
      await CategoryService.deleteCategory(category.publicId);

      setActionSuccess(
        `Category "${category.categoryName}" deleted successfully.`
      );

      const nextTotal = Math.max(0, meta.total - 1);
      const nextTotalPages = Math.ceil(nextTotal / PAGE_SIZE);
      const targetPage =
        nextTotalPages === 0
          ? 1
          : Math.min(meta.page, nextTotalPages);

      await loadCategories(targetPage, activeSearch);
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Unable to delete this category. It may have related records or a server-side constraint."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Product Categories
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Browse and search categories retrieved from the backend.
          </p>
        </div>

        {/* <p className="text-sm text-slate-600">
          {meta.total} {meta.total === 1 ? "category" : "categories"}
        </p> */}

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-600">
            {meta.total} {meta.total === 1 ? "category" : "categories"}
          </p>

          {/* <Link
            to="/categories/new"
            className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Create Category
          </Link> */}

          {canCreate && (
            <Link
              to={`/categories/new`}
              className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
            >
              Create Category
            </Link>
          )}
        </div>

      </div>

      <Card>
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="w-full flex-1">
            <label
              htmlFor="category-search"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Search categories
            </label>
            <Input
              id="category-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, code, or description"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              Search
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={clearSearch}
              disabled={isLoading && !activeSearch && !searchInput}
            >
              Clear
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <p>{error}</p>
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => loadCategories(meta.page, activeSearch)}
              disabled={isLoading}
            >
              Try again
            </Button>
          </div>
        </div>
      )}

      {location.state?.successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {location.state.successMessage}
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner label="Loading product categories..." />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Categories could not be displayed. Retry the request above.
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-800">
              {activeSearch
                ? "No matching categories"
                : "No categories found"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {activeSearch
                ? "Try another search term or clear the search."
                : "There are currently no categories to display."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Public ID</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Parent</th>
                  <th className="px-4 py-3 font-semibold">Level</th>
                  <th className="px-4 py-3 font-semibold">Sort order</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <tr
                    key={category.publicId || category._id}
                    className="align-top hover:bg-slate-50"
                  >
                    {/* 1. WE INTEGRATE THE ACTION LINK IN THE CORE CATEGORY NAME CELL LAYER BELOW */}
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-900">
                      {category.publicId ? (
                        <Link
                          to={`/categories/${encodeURIComponent(category.publicId)}`}
                          className="text-emerald-700 font-semibold hover:text-emerald-800 hover:underline transition-colors"
                        >
                          {category.categoryName || "Unnamed Category"}
                        </Link>
                      ) : (
                        displayValue(category.categoryName)
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 font-mono text-slate-700">
                      {displayValue(category.categoryCode)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-600">
                      {displayValue(category.publicId)}
                    </td>
                    <td className="min-w-48 max-w-xs px-4 py-4 text-slate-600">
                      <span className="line-clamp-3">
                        {displayValue(category.description)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {getParentCategory(category)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {displayValue(category.level)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {displayValue(category.sortOrder)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Badge
                        variant={getStatusVariant(category.status)}
                        className="capitalize"
                      >
                        {displayValue(category.status)}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-2">
                        {category.publicId && (
                          <Link
                            to={`/categories/${encodeURIComponent(category.publicId)}`}
                            // className="text-emerald-700 hover:underline mr-3"
                            // className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
                            className="inline-flex items-center justify-center rounded-lg border px-4 py-2.5 border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </Link>
                        )}

                        {canEdit && category.publicId && (
                          <Link
                            to={`/categories/${encodeURIComponent(category.publicId)}/edit`}
                            // className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
                            className="inline-flex items-center justify-center rounded-lg border px-4 py-2.5 border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                        )}

                        {canDeleteCategory && category.publicId && (
                          <Button
                            type="button"
                            variant="danger"
                            disabled={deletingId !== null}
                            onClick={() => handleDeleteCategory(category)}
                          >
                            {deletingId === category.publicId
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Page {meta.page}
          {meta.totalPages > 0 ? ` of ${meta.totalPages}` : ""} ·{" "}
          {meta.total} {meta.total === 1 ? "category" : "categories"}
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading || !hasPreviousPage}
            onClick={() => loadCategories(meta.page - 1, activeSearch)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading || !hasNextPage}
            onClick={() => loadCategories(meta.page + 1, activeSearch)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CategoriesPage;