// src/pages/brands/BrandRestoreByIdPage.jsx

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
import BrandService from "../../services/brandService";
import BrandRestoreDialog from "./BrandRestorePage";

function getUserRole(user) {
    const rawRole =
        user?.role?.name ??
        user?.role ??
        user?.user?.role?.name ??
        user?.user?.role ??
        user?.userRole ??
        user?.roleName ??
        "";

    return String(rawRole).trim().toLowerCase().replace(/[\\s-]+/g, "_");
}

function getErrorMessage(error) {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to load deleted brands. Please try again."
    );
}

function getDeletedBrandList(response) {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response)) return response;
    return [];
}

export default function BrandRestoreByIdPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = getUserRole(user) === "admin";

    const [brands, setBrands] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [brandToRestore, setBrandToRestore] = useState(null);

    // Used by Retry and after a successful restoration.
    const loadDeletedBrands = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const response = await BrandService.getDeletedBrands();
            setBrands(getDeletedBrandList(response));
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Non-admins see Access denied, so no request is needed.
        if (!isAdmin) return undefined;

        let cancelled = false;

        async function fetchDeletedBrands() {
            try {
                const response = await BrandService.getDeletedBrands();

                if (cancelled) return;

                setBrands(getDeletedBrandList(response));
                setErrorMessage("");
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

        void fetchDeletedBrands();

        return () => {
            cancelled = true;
        };
    }, [isAdmin]);

    if (!isAdmin) {
        return (
            <main className="mx-auto max-w-3xl p-6">
                <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Only an ADMIN can view or restore deleted brands.
                </p>
                <Button type="button" variant="secondary" onClick={() => navigate("/brands")}>
                    Back to brands
                </Button>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Restore deleted brands
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Select a deleted brand to review and restore it.
                    </p>
                </div>
                <Button type="button" variant="secondary" onClick={() => navigate("/brands")}>
                    Back to brands
                </Button>
            </div>

            {successMessage && (
                <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    {successMessage}
                </p>
            )}

            {errorMessage && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <p>{errorMessage}</p>
                    <button type="button" onClick={loadDeletedBrands} className="mt-2 font-semibold underline">
                        Try again
                    </button>
                </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">Deleted brand list</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {isLoading
                            ? "Loading deleted brands…"
                            : `${brands.length} deleted brand${brands.length === 1 ? "" : "s"}`}
                    </p>
                </div>

                {isLoading ? (
                    <p className="p-5 text-sm text-slate-600" role="status">
                        Loading deleted brands…
                    </p>
                ) : brands.length === 0 ? (
                    <p className="p-5 text-sm text-slate-600">No deleted brands found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th scope="col" className="px-5 py-3 font-semibold">Brand name</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Public ID</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Deleted at</th>
                                    <th scope="col" className="px-5 py-3 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {brands.map((brand) => (
                                    <tr key={brand.publicId} className="hover:bg-slate-50">
                                        <td className="px-5 py-4 font-medium text-slate-900">{brand.brandName}</td>
                                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{brand.publicId}</td>
                                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                                            {brand.deletedAt ? new Date(brand.deletedAt).toLocaleString() : "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-right">
                                            <Button type="button" onClick={() => setBrandToRestore(brand)}>
                                                Restore
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {brandToRestore && (
                <BrandRestoreDialog
                    brand={brandToRestore}
                    onClose={() => setBrandToRestore(null)}
                    onRestored={() => {
                        const restoredName = brandToRestore.brandName;
                        setBrandToRestore(null);
                        setSuccessMessage(`${restoredName} was restored successfully.`);
                        void loadDeletedBrands();
                    }}
                />
            )}
        </main>
    );
}
