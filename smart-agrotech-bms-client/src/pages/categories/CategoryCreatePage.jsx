
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { CategoryService } from "../../services/categoryService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const INITIAL_FORM = {
  categoryName: "",
  categoryCode: "",
  description: "",
  parentCategory: "",
  sortOrder: "0",
  status: "active",
};

const FIELD_NAMES = [
  "categoryName",
  "categoryCode",
  "description",
  "parentCategory",
  "sortOrder",
  "status",
];

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Category creation failed. Please try again."
  );
}

function parseApiFieldErrors(error) {
  const data = error?.response?.data;
  const fieldErrors = {};
  const items = Array.isArray(data?.errors)
    ? data.errors
    : Array.isArray(data?.issues)
      ? data.issues
      : [];

  for (const item of items) {
    const rawPath = item?.field || item?.path;
    const field = Array.isArray(rawPath)
      ? rawPath[rawPath.length - 1]
      : String(rawPath || "").split(".").pop();

    if (FIELD_NAMES.includes(field)) {
      fieldErrors[field] =
        item?.message || item?.msg || "Please check this field.";
    }
  }

  const message = String(data?.message || "").toLowerCase();

  if (message.includes("category name already exists")) {
    fieldErrors.categoryName = data.message;
  }

  if (message.includes("category code already exists")) {
    fieldErrors.categoryCode = data.message;
  }

  return fieldErrors;
}

function validateForm(form) {
  const errors = {};

  const name = form.categoryName.trim();
  const code = form.categoryCode.trim();
  const description = form.description.trim();

  if (!name) {
    errors.categoryName = "Category name is required.";
  } else if (name.length < 2 || name.length > 100) {
    errors.categoryName =
      "Category name must contain 2–100 characters.";
  }

  if (!code) {
    errors.categoryCode = "Category code is required.";
  } else if (code.length < 2 || code.length > 20) {
    errors.categoryCode =
      "Category code must contain 2–20 characters.";
  }

  if (description.length > 500) {
    errors.description =
      "Description cannot exceed 500 characters.";
  }

  if (form.sortOrder !== "") {
    const order = Number(form.sortOrder);

    if (!Number.isInteger(order) || order < 0) {
      errors.sortOrder =
        "Sort order must be a non-negative whole number.";
    }
  }

  if (!["active", "inactive"].includes(form.status)) {
    errors.status = "Select a valid category status.";
  }

  return errors;
}

export function CategoryCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [parentCategories, setParentCategories] = useState([]);
  const [isLoadingParents, setIsLoadingParents] = useState(true);
  const [parentLoadError, setParentLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [createdCategory, setCreatedCategory] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadParentCategories() {
      setIsLoadingParents(true);
      setParentLoadError("");

      try {
        // Load all available pages so the parent dropdown isn't
        // limited to only the first page of categories.
        const firstResponse = await CategoryService.getCategories({
          page: 1,
          limit: 100,
          sortBy: "categoryName",
          sortOrder: "asc",
        });

        if (!Array.isArray(firstResponse?.data)) {
          throw new Error(
            "The Categories API returned an unexpected response."
          );
        }

        const allCategories = [...firstResponse.data];
        const totalPages = Number(firstResponse.meta?.totalPages ?? 1);

        for (let page = 2; page <= totalPages; page += 1) {
          const response = await CategoryService.getCategories({
            page,
            limit: 100,
            sortBy: "categoryName",
            sortOrder: "asc",
          });

          if (Array.isArray(response?.data)) {
            allCategories.push(...response.data);
          }
        }

        if (active) {
          setParentCategories(
            allCategories.filter((category) => category._id)
          );
        }
      } catch (error) {
        if (active) {
          setParentLoadError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setIsLoadingParents(false);
        }
      }
    }

    loadParentCategories();

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setApiError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Guard against double clicks or repeated submissions.
    if (isSubmitting || createdCategory) return;

    setApiError("");

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const selectedParent = parentCategories.find(
      (category) => category._id === form.parentCategory
    );

    if (form.parentCategory && !selectedParent) {
      setErrors((previous) => ({
        ...previous,
        parentCategory:
          "The selected parent category is unavailable. Reload the page and try again.",
      }));
      return;
    }

    // The backend's create service does not calculate level from
    // parentCategory. The verified schema accepts an optional
    // non-negative integer, so calculate it from the selected parent.
    const level = selectedParent
      ? Number(selectedParent.level ?? 0) + 1
      : 0;

    const payload = {
      categoryName: form.categoryName.trim(),
      categoryCode: form.categoryCode.trim().toUpperCase(),
      description: form.description.trim(),
      parentCategory: selectedParent ? selectedParent._id : null,
      level,
      status: form.status,
    };

    // Let the backend model default handle sortOrder if left blank.
    if (form.sortOrder !== "") {
      payload.sortOrder = Number(form.sortOrder);
    }

    try {
      setIsSubmitting(true);

      const response = await CategoryService.createCategory(payload);
      const created = response?.data ?? response;

      if (!created?.publicId) {
        throw new Error(
          "The category may have been created, but its public ID was missing from the response. Check the category listing before trying again."
        );
      }

      setCreatedCategory(created);
      setSuccessMessage(
        response?.message || "Category created successfully."
      );
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        ...parseApiFieldErrors(error),
      }));

      setApiError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingParents) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading parent categories..." />
      </div>
    );
  }

  if (createdCategory) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="space-y-4 bg-white">
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"
            role="status"
          >
            <h1 className="text-xl font-semibold text-emerald-800">
              Category created successfully
            </h1>
            <p className="mt-2 text-sm text-emerald-700">
              {successMessage}
            </p>
            <p className="mt-2 text-sm text-emerald-800">
              {createdCategory.categoryName} (
              {createdCategory.categoryCode})
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() =>
                navigate(
                  `/categories/${encodeURIComponent(
                    createdCategory.publicId
                  )}`
                )
              }
            >
              View Category
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/categories")}
            >
              Back to Categories
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Create Category
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Add a root category or place it under an existing category.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/categories")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </header>

      {apiError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {apiError}
        </div>
      )}

      <Card className="space-y-5 bg-white">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Input
                label="Category name *"
                id="categoryName"
                name="categoryName"
                value={form.categoryName}
                onChange={handleChange}
                placeholder="e.g. Fertilizers"
                maxLength={100}
                required
                disabled={isSubmitting}
              />
              {errors.categoryName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.categoryName}
                </p>
              )}
            </div>

            <div>
              <Input
                label="Category code *"
                id="categoryCode"
                name="categoryCode"
                value={form.categoryCode}
                onChange={handleChange}
                placeholder="e.g. FERT"
                maxLength={20}
                required
                disabled={isSubmitting}
              />
              {errors.categoryCode && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.categoryCode}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                The backend stores the code in uppercase.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={500}
              rows={4}
              disabled={isSubmitting}
              placeholder="Optional category description"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
            />
            <div className="mt-1 flex justify-between gap-3">
              {errors.description ? (
                <p className="text-sm text-red-600">
                  {errors.description}
                </p>
              ) : (
                <span className="text-xs text-slate-500">
                  Maximum 500 characters.
                </span>
              )}
              <span className="text-xs text-slate-500">
                {form.description.length}/500
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="parentCategory"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Parent category
            </label>
            <select
              id="parentCategory"
              name="parentCategory"
              value={form.parentCategory}
              onChange={handleChange}
              disabled={isSubmitting || Boolean(parentLoadError)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
            >
              <option value="">None — create a root category</option>
              {parentCategories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.categoryName} ({category.categoryCode})
                </option>
              ))}
            </select>

            {errors.parentCategory && (
              <p className="mt-1 text-sm text-red-600">
                {errors.parentCategory}
              </p>
            )}

            {parentLoadError && (
              <div className="mt-2 text-sm text-amber-700" role="alert">
                Parent categories could not be loaded: {parentLoadError}
                <p className="mt-1">
                  You can still create a root category. Reload the page to
                  try loading parent categories again.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Input
                label="Sort order"
                id="sortOrder"
                name="sortOrder"
                type="number"
                min="0"
                step="1"
                value={form.sortOrder}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.sortOrder && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.sortOrder}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                A non-negative whole number. Defaults to 0 if blank.
              </p>
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.status}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating category..." : "Create Category"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/categories")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <Link
        to="/categories"
        className="inline-block text-sm text-emerald-700 hover:underline"
      >
        Return to category list
      </Link>
    </div>
  );
}

export default CategoryCreatePage;
