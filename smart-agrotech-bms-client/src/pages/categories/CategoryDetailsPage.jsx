// src/pages/categories/categoryDetailsPage.jsx

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

import { CategoryService } from "../../services/categoryService";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

// from "../../components/ui";

const getStatusVariant = (status) => {
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
};

const CategoryDetailsPage = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

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
    .replace(/[\s-]+/g, "_");

  const canEdit = ["admin", "moderator"].includes(role);

  const canDeleteCategory = role === "admin";

  useEffect(() => {
    let isMounted = true;

    const fetchCategory = async () => {
      setLoading(true);
      setError("");
      setCategory(null);

      try {
        if (!publicId) {
          throw new Error("A category public ID was not provided.");
        }

        // This service method must request GET /product-categories/:publicId.
        const response = await CategoryService.getCategory(publicId);

        // The service returns response.data from Axios. For the usual API
        // envelope, the category itself is in response.data.
        const result = response?.data ?? response;

        if (!result || typeof result !== "object" || Array.isArray(result)) {
          throw new Error("Category not found.");
        }

        if (isMounted) {
          setCategory(result);
        }
      } catch (err) {
        if (isMounted) {
          const statusCode = err?.response?.status;

          setError(
            statusCode === 404
              ? "Category not found. It may have been removed or the link may be incorrect."
              : err?.response?.data?.message ||
              err?.message ||
              "Unable to load category details. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCategory();

    return () => {
      isMounted = false;
    };
  }, [publicId]);

  const handleDelete = async () => {
    if (!category?.publicId || isDeleting || !canDeleteCategory) return;

    const confirmed = window.confirm(
      `Delete category "${category.categoryName}"?`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteError("");
    setDeleteSuccess("");

    try {
      await CategoryService.deleteCategory(category.publicId);

      setDeleteSuccess("Category deleted successfully.");

      // Return to the listing after a successful deletion.
      navigate("/categories", {
        replace: true,
        state: { successMessage: "Category deleted successfully." },
      });
    } catch (error) {
      setDeleteError(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Unable to delete this category. Check whether it has related records and try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const renderParentCategory = () => {
    const parent = category?.parentCategory;

    if (!parent) {
      return "No parent category (root category)";
    }

    if (typeof parent === "object") {
      return (
        parent.categoryName ||
        parent.name ||
        parent.publicId ||
        "Parent category assigned"
      );
    }

    return String(parent);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12" role="status">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="space-y-4 p-6">
        <Button onClick={() => navigate("/categories")} variant="secondary">
          Back to Categories
        </Button>

        <Card>
          <div className="p-6">
            <h1 className="text-xl font-semibold">Category details unavailable</h1>
            <p className="mt-2 text-red-600">
              {error || "Category not found."}
            </p>
            <Button
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const details = [
    {
      label: "Public ID",
      value: category.publicId || "—",
    },
    {
      label: "Description",
      value: category.description?.trim() || "No description provided",
    },
    {
      label: "Parent category",
      value: renderParentCategory(),
    },
    {
      label: "Category level",
      value: category.level ?? "—",
    },
    {
      label: "Sort order",
      value: category.sortOrder ?? "—",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {category.categoryName || "Category Details"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View the information for this product category.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* PLACE AN EDIT ACTION BUTTON GATED FOR PERMITTED SECURITY TIER PROFILES */}
          {canEdit && category.publicId && (
            <Link
              to={`/categories/${encodeURIComponent(category.publicId)}/edit`}
              className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
            >
              Edit Category
            </Link>
          )}


          {canDeleteCategory && (
            <Button
              type="button"
              variant="danger"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting..." : "Delete Category"}
            </Button>
          )}

          <Button onClick={() => navigate("/categories")} variant="secondary">
            Back to Categories
          </Button>
        </div>

      </div>


      {/* 4. VISUAL ACTION LAYER FOR INLINE BACKEND ERROR RESPONSE ALERTS */}
      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <p className="font-semibold">Action Blocked by Server Logic:</p>
          <p className="mt-1">{deleteError}</p>
        </div>
      )}

      {deleteSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800" role="status">
          {deleteSuccess}
        </div>
      )}
      

      <Card>
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
            <div>
              <p className="text-sm text-gray-500">Category name</p>
              <h2 className="mt-1 text-xl font-semibold">
                {category.categoryName || "Unnamed category"}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Code: {category.categoryCode || "—"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm text-gray-500">Status</p>
              <Badge variant={getStatusVariant(category.status)}>
                {category.status || "Unknown"}
              </Badge>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-5 pt-5 sm:grid-cols-2">
            {details.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-sm font-medium text-gray-500">{label}</dt>
                <dd className="mt-1 wrap-break-words text-sm text-gray-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <Link
        to="/categories"
        className="inline-block text-sm text-blue-600 hover:underline"
      >
        Return to category list
      </Link>
    </div>
  );
};

export default CategoryDetailsPage;