// src/pages/brands/BrandDetailsPage.jsx

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link, useNavigate, useParams } from "react-router-dom";
import BrandService from "../../services/brandService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import BrandDeletePage from "./BrandDeletePage";

function messageFor(error) {
  const status = error?.response?.status;
  if (status === 404) return "Brand not found. Check the brand ID or return to the list.";
  if (status === 403) return "You do not have permission to view this brand.";
  if (status === 401) return "Your session may have expired. Please sign in again.";
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message === "Network Error") return "Cannot connect to the server. Check that the backend is running.";
  return error?.message || "Unable to load brand details.";
}

function StatusBadge({ status }) {
  const active = status === "active";
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{status || "Unknown"}</span>;
}

function Row({ label, children }) {
  return <div className="grid gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"><dt className="text-sm font-medium text-slate-500">{label}</dt><dd className="min-w-0 wrap-break-words text-sm text-slate-800">{children || "—"}</dd></div>;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

// SOLVED ERROR 1: Removed useEffect completely. State is adjusted during the render phase instead.
function BrandLogo({ brand }) {
  const [failedUrl, setFailedUrl] = useState("");
  const [failed, setFailed] = useState(false);

  // If the brand logo prop changes, reset the tracking states instantly during render
  if (brand.logo !== failedUrl && failed) {
    setFailed(false);
    setFailedUrl(brand.logo || "");
  }

  if (!brand.logo || failed) return <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-3xl font-semibold text-slate-500">{(brand.brandName || "B").trim().charAt(0).toUpperCase()}</div>;
  return <img src={brand.logo} alt={`${brand.brandName || "Brand"} logo`} onError={() => { setFailed(true); setFailedUrl(brand.logo || ""); }} className="h-24 w-24 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-2" />;
}

export default function BrandDetailsPage() {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const canEditBrands = ["ADMIN", "MODERATOR"].includes(
    String(user?.role ?? "").toUpperCase()
  );

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

  const canDeleteProduct = role === "admin";

  // SOLVED ERROR 2: Removed synchronous state calls from the inner execution hook logic.
  const loadBrand = useCallback(async (isInitialLoad = false) => {
    if (!publicId) {
      setBrand(null);
      setError("No brand identifier was provided in the URL.");
      setLoading(false);
      return;
    }

    // Only update loading if this isn't the initial state setup to prevent loop renders
    if (!isInitialLoad) {
      setLoading(true);
      setError("");
    }

    try {
      const result = await BrandService.getBrand(publicId);
      if (!result?.data || typeof result.data !== "object" || Array.isArray(result.data)) {
        setBrand(null);
        setError("The server did not return a brand record.");
      } else {
        setBrand(result.data);
        setError(""); // Clear errors safely on success
      }
    } catch (err) {
      setBrand(null);
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  // Safely execute initial load transitions on component mount
  // useEffect(() => { 
  //   let isMounted = true;
  //   if (isMounted) {
  //     loadBrand(true); 
  //   }
  //   return () => { isMounted = false; };
  // }, [loadBrand, retry]);

  useEffect(() => {
    let isMounted = true;

    const fetchBrand = async () => {
      try {
        if (isMounted) {
          await loadBrand(true);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Failed to load brand:", error);
        }
      }
    };

    fetchBrand();

    return () => {
      isMounted = false;
    };
  }, [loadBrand, retry]);

  if (loading) return <main className="mx-auto flex min-h-64 max-w-5xl items-center justify-center p-6"><LoadingSpinner /></main>;

  if (error || !brand) return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 lg:p-8">
      <Button type="button" variant="secondary" onClick={() => navigate("/brands")}>Back to brands</Button>
      <Card className="p-6 text-center sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900">{error.includes("Brand not found") ? "Brand not found" : "Unable to load brand"}</h1>
        <p className="mt-2 text-sm text-slate-600">{error || "No brand data was returned."}</p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={() => setRetry((n) => n + 1)}>Retry</Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/brands")}>Return to brands</Button>
        </div>
      </Card>
    </main>
  );

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div>
        <Link to="/brands" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">← Back to brands</Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="wrap-break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{brand.brandName || "Brand details"}</h1><p className="mt-1 text-sm text-slate-500">Brand profile and record information</p></div>
          <div className="flex items-center gap-2">
            <StatusBadge status={brand.status} />
            {canEditBrands && (
              <Link
                to={`/brands/${encodeURIComponent(brand.publicId)}/edit`}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Edit Brand
              </Link>
            )}
            {/* <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete brand
            </Button> */}
            {canDeleteProduct && (
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete Product
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <BrandLogo brand={brand} />
          <div className="min-w-0"><h2 className="wrap-break-words text-xl font-semibold text-slate-900">{brand.brandName || "Unnamed brand"}</h2><p className="mt-1 text-sm text-slate-500">{brand.brandCode || "No brand code"}</p>
            {brand.website && <a href={brand.website} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all text-sm font-medium text-emerald-700 underline underline-offset-2">Visit brand website ↗</a>}
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-slate-900">Brand information</h2>
        <dl className="mt-3">
          <Row label="Brand name">{brand.brandName}</Row>
          <Row label="Brand code">{brand.brandCode}</Row>
          <Row label="Public ID">{brand.publicId}</Row>
          <Row label="Status">{brand.status}</Row>
          <Row label="Country">{brand.country}</Row>
          <Row label="Website">{brand.website && <a href={brand.website} target="_blank" rel="noreferrer" className="text-emerald-700 underline">{brand.website}</a>}</Row>
          <Row label="Description">{brand.description}</Row>
          <Row label="Created">{formatDate(brand.createdAt)}</Row>
          <Row label="Last updated">{formatDate(brand.updatedAt)}</Row>
        </dl>
      </Card>
      <Button type="button" variant="secondary" onClick={() => navigate("/brands")}>Back to brands</Button>

      {showDeleteDialog && brand && (
        <BrandDeletePage
          brand={brand}
          onClose={() => setShowDeleteDialog(false)}
          onDeleted={() => {
            setShowDeleteDialog(false);
            navigate("/brands", {
              replace: true,
              state: {
                message: `${brand.brandName} was deleted successfully.`,
              },
            });
          }}
        />
      )}
    </main>
  );
}
