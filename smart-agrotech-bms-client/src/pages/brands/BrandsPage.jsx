// src/pages/brands/BrandsPage.jsx

import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import BrandService from "../../services/brandService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const PAGE_SIZE = 10;

function getErrorMessage(error) {
    const data = error?.response?.data;
    if (Array.isArray(data?.errors)) {
        return data.errors.map((item) => item?.message || item?.msg || String(item)).join(" ");
    }
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
    if (error?.message === "Network Error") {
        return "Could not connect to the server. Check that the backend is running and try again.";
    }
    return error?.message || "Unable to load brands. Please try again.";
}

function StatusBadge({ status }) {
    const active = status === "active";
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
            }`}>
            {status || "Unknown"}
        </span>
    );
}

function BrandLogo({ brand }) {
    const [imageFailed, setImageFailed] = useState(false);
    if (!brand.logo || imageFailed) {
        return (
            <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-semibold text-slate-500"
                aria-label={`No logo available for ${brand.brandName || "brand"}`}
            >
                {(brand.brandName || "B").trim().charAt(0).toUpperCase() || "B"}
            </div>
        );
    }
    return (
        <img
            src={brand.logo}
            alt={`${brand.brandName || "Brand"} logo`}
            className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1"
            loading="lazy"
            onError={() => setImageFailed(true)}
        />
    );
}

export default function BrandsPage() {
    const [brands, setBrands] = useState([]);
    const [meta, setMeta] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [country, setCountry] = useState("");
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { user } = useAuth();

    const rawRole =
        user?.role?.name ??
        user?.role ??
        user?.user?.role?.name ??
        user?.user?.role ??
        user?.userRole ??
        user?.roleName ??
        "";

    const isAdmin =
        String(rawRole).trim().toLowerCase().replace(/[\s-]+/g, "_") ===
        "admin";

    const loadBrands = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = { page, limit: PAGE_SIZE, sortBy: "brandName", sortOrder: "asc" };
            if (search.trim()) params.search = search.trim();
            if (status) params.status = status;
            if (country.trim()) params.country = country.trim();

            // Brand API envelope: { success, message, meta, data: [...] }
            const result = await BrandService.getBrands(params);
            setBrands(Array.isArray(result?.data) ? result.data : []);
            setMeta(result?.meta ?? null);

            const totalPages = Number(result?.meta?.totalPages);
            if (Number.isFinite(totalPages) && totalPages > 0 && page > totalPages) {
                setPage(totalPages);
            }
        } catch (requestError) {
            setBrands([]);
            setMeta(null);
            setError(getErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    }, [page, search, status, country]);

    // useEffect(() => {
    //     async function fetchData() {
    //         await loadBrands(1, searchInput);
    //     }
    //     fetchData();
    // }, [loadBrands, searchInput]);

    useEffect(() => {
        async function fetchData() {
            await loadBrands();
        }

        void fetchData();
    }, [loadBrands, searchInput, reloadKey]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        setPage(1);
        setSearch(searchInput);
    };

    const handleClearFilters = () => {
        setSearchInput("");
        setSearch("");
        setStatus("");
        setCountry("");
        setPage(1);
    };

    const total = Number(meta?.total ?? brands.length);
    const totalPages = Math.max(1, Number(meta?.totalPages ?? 1));
    const currentPage = Number(meta?.page ?? page);

    return (
        <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">Catalog</p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Brands</h1>
                    <p className="mt-1 text-sm text-slate-600">Browse and search your registered brands.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-600">
                        {!loading && !error ? `${total} brand${total === 1 ? "" : "s"}` : ""}
                    </p>

                    <Link
                        to="/brands/new"
                        className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
                    >
                        Create brand
                    </Link>

                    {isAdmin && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate("/brands/restore")}
                        >
                            Restore deleted brand
                        </Button>
                    )}
                </div>
            </header>

            <Card className="space-y-4">
                <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="md:col-span-5">
                        <label htmlFor="brand-search" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Search brands
                        </label>
                        <input
                            id="brand-search"
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Name, code, description, or country"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label htmlFor="brand-status" className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                        <select
                            id="brand-status"
                            value={status}
                            onChange={(event) => { setPage(1); setStatus(event.target.value); }}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        >
                            <option value="">All statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="md:col-span-4">
                        <label htmlFor="brand-country" className="mb-1.5 block text-sm font-medium text-slate-700">Country</label>
                        <input
                            id="brand-country"
                            type="text"
                            value={country}
                            onChange={(event) => { setPage(1); setCountry(event.target.value); }}
                            placeholder="Filter by country"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row md:col-span-12">
                        <Button type="submit">Search</Button>
                        <Button type="button" variant="secondary" onClick={handleClearFilters}>Clear filters</Button>
                    </div>
                </form>
            </Card>

            {loading ? (
                <div className="flex min-h-48 items-center justify-center" role="status">
                    <LoadingSpinner />
                    <span className="sr-only">Loading brands…</span>
                </div>
            ) : error ? (
                <Card className="space-y-3 border border-red-200">
                    <h2 className="text-lg font-semibold text-red-800">Could not load brands</h2>
                    <p className="text-sm text-slate-600">{error}</p>
                    <div>
                        <Button type="button" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
                    </div>
                </Card>
            ) : brands.length === 0 ? (
                <Card className="py-12 text-center">
                    <h2 className="text-lg font-semibold text-slate-900">No brands found</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        {search || status || country ? "Try changing your search or filters." : "There are no brands to display yet."}
                    </p>
                    {(search || status || country) && (
                        <div className="mt-4">
                            <Button type="button" variant="secondary" onClick={handleClearFilters}>Clear filters</Button>
                        </div>
                    )}
                </Card>
            ) : (
                <>
                    <section aria-label="Brand list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {brands.map((brand) => (
                            <Card key={brand.publicId || brand._id} className="h-full">
                                <article className="flex h-full flex-col gap-4">
                                    <div className="flex items-start gap-3">
                                        <BrandLogo brand={brand} />
                                        <div className="min-w-0 flex-1">
                                            <h2 className="wrap-break-words text-base font-semibold text-slate-900">{brand.brandName || "Unnamed brand"}</h2>
                                            <p className="mt-1 text-xs text-slate-500">{brand.brandCode || brand.publicId || "No code"}</p>
                                            <div className="mt-2"><StatusBadge status={brand.status} /></div>
                                        </div>
                                    </div>
                                    <p className="min-h-10 wrap-break-words text-sm leading-6 text-slate-600">
                                        {brand.description || "No description provided."}
                                    </p>
                                    <div className="mt-auto space-y-2 border-t border-slate-100 pt-3 text-sm">
                                        {brand.country && (
                                            <p className="wrap-break-words text-slate-600">
                                                <span className="font-medium text-slate-700">Country:</span> {brand.country}
                                            </p>
                                        )}
                                        {brand.website && (
                                            <p className="break-all">
                                                <span className="font-medium text-slate-700">Website:</span>{" "}
                                                <a href={brand.website} target="_blank" rel="noreferrer" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900">
                                                    {brand.website}
                                                </a>
                                            </p>
                                        )}
                                        {brand.publicId && <p className="text-xs text-slate-400">ID: {brand.publicId}</p>}


                                        {brand.publicId && (
                                            <Link
                                                to={`/brands/${encodeURIComponent(brand.publicId)}`}
                                                className="mt-3 inline-flex text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                                            >
                                                View details
                                            </Link>
                                        )}

                                    </div>
                                </article>


                            </Card>
                        ))}
                    </section>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-600">
                            Page {currentPage} of {totalPages}{meta?.total != null ? ` · ${total} total brands` : ""}
                        </p>
                        <nav className="flex items-center gap-2" aria-label="Brand pagination">
                            <Button type="button" variant="secondary" disabled={currentPage <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                                Previous
                            </Button>
                            <Button type="button" variant="secondary" disabled={currentPage >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>
                                Next
                            </Button>
                        </nav>
                    </div>
                </>
            )}
        </main>
    );
}
