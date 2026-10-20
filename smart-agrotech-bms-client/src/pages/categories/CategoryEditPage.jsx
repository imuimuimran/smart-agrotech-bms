
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { CategoryService } from "../../services/categoryService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../hooks/useAuth";

function getRole(user) {
  const value =
    user?.role?.name ??
    user?.role ??
    user?.user?.role?.name ??
    user?.user?.role ??
    user?.userRole ??
    user?.roleName ??
    "";

  return String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item) => item.message || item.msg || String(item))
      .join(" ");
  }

  if (data?.errors && typeof data.errors === "object") {
    return Object.values(data.errors).flat().join(" ");
  }

  return (
    data?.message ||
    data?.error ||
    error?.message ||
    "Unable to update the category. Please try again."
  );
}

function unwrapCategory(result) {
  return result?.data?.data ?? result?.data ?? result;
}

function unwrapList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  return [];
}

function validateForm(form) {
  const errors = {};

  const name = form.categoryName.trim();
  const code = form.categoryCode.trim();
  const description = form.description.trim();

  if (!name) {
    errors.categoryName = "Category name is required.";
  } else if (name.length < 2 || name.length > 100) {
    errors.categoryName = "Category name must be 2–100 characters.";
  }

  if (!code) {
    errors.categoryCode = "Category code is required.";
  } else if (code.length < 2 || code.length > 20) {
    errors.categoryCode = "Category code must be 2–20 characters.";
  }

  if (description.length > 500) {
    errors.description = "Description cannot exceed 500 characters.";
  }

  if (form.sortOrder === "") {
    errors.sortOrder = "Sort order is required.";
  } else if (
    !Number.isInteger(Number(form.sortOrder)) ||
    Number(form.sortOrder) < 0
  ) {
    errors.sortOrder = "Sort order must be a non-negative whole number.";
  }

  if (!["active", "inactive"].includes(form.status)) {
    errors.status = "Choose a valid status.";
  }

  return errors;
}

function FieldError({ children }) {
  return children ? (
    <p className="mt-1 text-sm text-red-600" role="alert">
      {children}
    </p>
  ) : null;
}

export function CategoryEditPage() {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();

  const role = getRole(user);
  const canEdit = ["admin", "moderator"].includes(role);

  const [category, setCategory] = useState(null);
  const [form, setForm] = useState(null);
  const [parents, setParents] = useState([]);
  const [parentsLoaded, setParentsLoaded] = useState(false);
  const [parentError, setParentError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isAuthLoading || !canEdit || !publicId) return;

    let active = true;

    async function loadCategory() {
      setIsLoading(true);
      setApiError("");
      setParentError("");

      try {
        const response = await CategoryService.getCategory(publicId);
        const item = unwrapCategory(response);

        if (!item || !item.publicId) {
          throw new Error("The requested category could not be found.");
        }

        if (!active) return;

        setCategory(item);
        setForm({
          categoryName: item.categoryName ?? "",
          categoryCode: item.categoryCode ?? "",
          description: item.description ?? "",
          parentCategory:
            typeof item.parentCategory === "object"
              ? item.parentCategory?._id ?? ""
              : item.parentCategory ?? "",
          sortOrder: String(item.sortOrder ?? 0),
          status: item.status ?? "active",
        });
      } catch (error) {
        if (active) setApiError(getErrorMessage(error));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    async function loadParentCategories() {
      try {
        const firstResponse = await CategoryService.getCategories({
          page: 1,
          limit: 100,
          sortBy: "categoryName",
          sortOrder: "asc",
        });

        const allParents = unwrapList(firstResponse);
        const totalPages = Number(firstResponse?.meta?.totalPages ?? 1);

        for (let page = 2; page <= totalPages; page += 1) {
          const response = await CategoryService.getCategories({
            page,
            limit: 100,
            sortBy: "categoryName",
            sortOrder: "asc",
          });
          allParents.push(...unwrapList(response));
        }

        if (active) {
          setParents(allParents.filter((item) => item._id));
          setParentsLoaded(true);
        }
      } catch (error) {
        if (active) {
          setParentError(getErrorMessage(error));
          setParentsLoaded(false);
        }
      }
    }

    loadCategory();
    loadParentCategories();

    return () => {
      active = false;
    };
  }, [publicId, canEdit, isAuthLoading]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setApiError("");
    setSuccessMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting || successMessage || !form || !category) return;

    setApiError("");

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    const payload = {
      categoryName: form.categoryName.trim(),
      categoryCode: form.categoryCode.trim().toUpperCase(),
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder),
      status: form.status,
    };

    // If the parent list failed to load, leave the existing relationship
    // untouched rather than accidentally clearing it.
    if (parentsLoaded) {
      if (form.parentCategory) {
        const selectedParent = parents.find(
          (item) => item._id === form.parentCategory
        );

        if (!selectedParent) {
          setErrors((previous) => ({
            ...previous,
            parentCategory: "Choose a valid parent category.",
          }));
          return;
        }

        if (selectedParent._id === category._id) {
          setErrors((previous) => ({
            ...previous,
            parentCategory: "A category cannot be its own parent.",
          }));
          return;
        }

        payload.parentCategory = selectedParent._id;
      } else {
        // Explicit null tells the backend to make this a root category.
        payload.parentCategory = null;
      }
    }

    try {
      setIsSubmitting(true);

      await CategoryService.updateCategory(publicId, payload);

      setSuccessMessage("Category updated successfully.");
    } catch (error) {
      const message = getErrorMessage(error);
      setApiError(message);

      // Show common duplicate-value errors beside their fields as well.
      if (message.toLowerCase().includes("category name already exists")) {
        setErrors((previous) => ({
          ...previous,
          categoryName: message,
        }));
      }

      if (message.toLowerCase().includes("category code already exists")) {
        setErrors((previous) => ({
          ...previous,
          categoryCode: message,
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card className="space-y-3">
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="text-sm text-slate-600">
            Only administrators and moderators can edit categories.
          </p>
          <Button onClick={() => navigate("/categories")}>
            Back to Categories
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16" role="status">
        <LoadingSpinner />
      </div>
    );
  }

  if (!category || !form) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Card className="space-y-3">
          <h1 className="text-xl font-semibold">
            Unable to load category
          </h1>
          <p className="text-sm text-red-600" role="alert">
            {apiError || "Category not found."}
          </p>
          <Button onClick={() => navigate("/categories")}>
            Back to Categories
          </Button>
        </Card>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card className="space-y-4">
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"
            role="status"
          >
            <h1 className="text-xl font-semibold text-emerald-800">
              Update successful
            </h1>
            <p className="mt-2 text-sm text-emerald-700">
              {successMessage}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                navigate(`/categories/${encodeURIComponent(publicId)}`)
              }
            >
              View Category Details
            </Button>
            <Button
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
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Edit Category
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Update {category.categoryName} ({category.publicId}).
          </p>
        </div>

        <Button
          variant="secondary"
          disabled={isSubmitting}
          onClick={() =>
            navigate(`/categories/${encodeURIComponent(publicId)}`)
          }
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
                maxLength={100}
                required
                disabled={isSubmitting}
              />
              <FieldError>{errors.categoryName}</FieldError>
            </div>

            <div>
              <Input
                label="Category code *"
                id="categoryCode"
                name="categoryCode"
                value={form.categoryCode}
                onChange={handleChange}
                maxLength={20}
                required
                disabled={isSubmitting}
              />
              <FieldError>{errors.categoryCode}</FieldError>
              <p className="mt-1 text-xs text-slate-500">
                The code is saved in uppercase.
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
            />
            <FieldError>{errors.description}</FieldError>
            <p className="mt-1 text-xs text-slate-500">
              {form.description.length}/500 characters
            </p>
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
              disabled={isSubmitting || !parentsLoaded}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
            >
              <option value="">None — root category</option>
              {parents
                .filter((item) => item._id !== category._id)
                .map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.categoryName} ({item.categoryCode})
                  </option>
                ))}
            </select>
            <FieldError>{errors.parentCategory}</FieldError>
            {parentError && (
              <p className="mt-1 text-sm text-amber-700" role="alert">
                Parent options could not be loaded. The existing parent
                will be left unchanged. Reload this page to try again.
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              The backend checks that the selected parent does not create
              a circular category hierarchy.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Input
                label="Sort order *"
                id="sortOrder"
                name="sortOrder"
                type="number"
                min="0"
                step="1"
                value={form.sortOrder}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
              <FieldError>{errors.sortOrder}</FieldError>
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
              <FieldError>{errors.status}</FieldError>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving changes..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() =>
                navigate(`/categories/${encodeURIComponent(publicId)}`)
              }
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <Link
        to={`/categories/${encodeURIComponent(publicId)}`}
        className="inline-block text-sm text-emerald-700 hover:underline"
      >
        Return to category details
      </Link>
    </div>
  );
}

export default CategoryEditPage;
