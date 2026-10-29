// // src/pages/categories/categoryRestoreByIdPage.jsx

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
// import { CategoryService } from "../../service/categoryService";
import { CategoryService } from "../../services/categoryService";

function getUserRole(user) {
    const rawRole =
        user?.role?.name ??
        user?.role ??
        user?.user?.role?.name ??
        user?.user?.role ??
        user?.userRole ??
        user?.roleName ??
        "";

    return String(rawRole)
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function getDeletedCategoryList(response) {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response)) return response;
    return [];
}

function getErrorMessage(error) {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to load deleted categories. Please try again."
    );
}

export default function CategoryRestoreByIdPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = getUserRole(user) === "admin";

    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [restoringId, setRestoringId] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const loadDeletedCategories = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const response = await CategoryService.getDeletedCategories();
            setCategories(getDeletedCategoryList(response));
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAdmin) return undefined;

        let cancelled = false;

        async function fetchDeletedCategories() {
            try {
                const response = await CategoryService.getDeletedCategories();

                if (!cancelled) {
                    setCategories(getDeletedCategoryList(response));
                    setErrorMessage("");
                }
            } catch (error) {
                if (!cancelled) {
                    setErrorMessage(getErrorMessage(error));
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void fetchDeletedCategories();

        return () => {
            cancelled = true;
        };
    }, [isAdmin]);

    async function handleRestore(category) {
        if (!isAdmin || !category?.publicId || restoringId) return;

        const confirmed = window.confirm(
            `Restore category "${category.categoryName}"?`
        );

        if (!confirmed) return;

        setRestoringId(category.publicId);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            await CategoryService.restoreCategory(category.publicId);

            setSuccessMessage(
                `Category "${category.categoryName}" restored successfully.`
            );

            await loadDeletedCategories();
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setRestoringId(null);
        }
    }

    if (!isAdmin) {
        return (
            <main className="mx-auto max-w-3xl space-y-4 p-6">
                <h1 className="text-2xl font-bold text-slate-900">
                    Access denied
                </h1>
                <p className="text-sm text-slate-600">
                    Only an ADMIN can view or restore deleted categories.
                </p>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate("/categories")}
                >
                    Back to categories
                </Button>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Restore deleted categories
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Select a deleted category to restore it.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate("/categories")}
                >
                    Back to categories
                </Button>
            </header>

            {successMessage && (
                <p
                    role="status"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                    {successMessage}
                </p>
            )}

            {errorMessage && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                    <p>{errorMessage}</p>
                    <button
                        type="button"
                        onClick={loadDeletedCategories}
                        className="mt-2 font-semibold underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">
                        Deleted category list
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {isLoading
                            ? "Loading deleted categories…"
                            : `${categories.length} deleted ${categories.length === 1
                                ? "category"
                                : "categories"
                            }`}
                    </p>
                </div>

                {isLoading ? (
                    <p className="p-5 text-sm text-slate-600" role="status">
                        Loading deleted categories…
                    </p>
                ) : categories.length === 0 ? (
                    <p className="p-5 text-sm text-slate-600">
                        No deleted categories found.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">
                                        Category name
                                    </th>
                                    <th className="px-5 py-3 font-semibold">
                                        Public ID
                                    </th>
                                    <th className="px-5 py-3 font-semibold">
                                        Deleted at
                                    </th>
                                    <th className="px-5 py-3 text-right font-semibold">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {categories.map((category) => (
                                    <tr
                                        key={category.publicId || category._id}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="px-5 py-4 font-medium text-slate-900">
                                            {category.categoryName || "Unnamed category"}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                                            {category.publicId || "—"}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                                            {category.deletedAt
                                                ? new Date(category.deletedAt).toLocaleString()
                                                : "—"}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-right">
                                            <Button
                                                type="button"
                                                disabled={
                                                    restoringId !== null ||
                                                    !category.publicId
                                                }
                                                onClick={() => handleRestore(category)}
                                            >
                                                {restoringId === category.publicId
                                                    ? "Restoring..."
                                                    : "Restore"}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}
