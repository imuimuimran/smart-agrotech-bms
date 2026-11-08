import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { SupplierService } from "../../services/supplierService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import SupplierRestoreDialog from "./SupplierRestoreDialog";

function getRole(user) {
  const rawRole =
    user?.role?.name ?? user?.role ?? user?.user?.role?.name ??
    user?.user?.role ?? user?.userRole ?? user?.roleName ?? "";
  return String(rawRole).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "Only an ADMIN can view deleted suppliers.";
  if (!error?.response) return "Could not connect to the server. Check that the backend is running.";
  return data?.message || error?.message || "Unable to load deleted suppliers.";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function SupplierRestorePage() {
  const { user } = useAuth();
  const isAdmin = getRole(user) === "admin";

  const [suppliers, setSuppliers] = useState([]);
  const [supplierToRestore, setSupplierToRestore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const loadDeletedSuppliers = useCallback(async (isActive) => {
    try {
      setError("");
      const response = await SupplierService.getDeletedSuppliers();
      if (!isActive()) return;

      if (!Array.isArray(response?.data)) {
        throw new Error("Unexpected deleted suppliers API response.");
      }
      setSuppliers(response.data);
    } catch (loadError) {
      if (!isActive()) return;
      setSuppliers([]);
      setError(getErrorMessage(loadError));
    } finally {
      if (isActive()) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return undefined;

    let active = true;
    const timer = window.setTimeout(() => {
      void loadDeletedSuppliers(() => active);
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isAdmin, loadDeletedSuppliers, reloadKey]);

  if (!isAdmin) return <Navigate to="/forbidden" replace />;

  const handleRestored = (restoredSupplier) => {
    setSupplierToRestore(null);
    setSuccessMessage(`${restoredSupplier.supplierName || "Supplier"} was restored successfully.`);
    setIsLoading(true);
    setReloadKey((value) => value + 1);
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Restore Deleted Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">Review deleted suppliers and restore records when needed.</p>
        </div>
        <Link to="/suppliers" className="text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900">
          Back to Suppliers
        </Link>
      </header>

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <p>{error}</p>
          <Button type="button" variant="secondary" className="mt-3" onClick={() => { setIsLoading(true); setReloadKey((value) => value + 1); }}>
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : suppliers.length === 0 ? (
        !error && (
          <Card className="p-10 text-center">
            <h2 className="text-lg font-semibold text-slate-800">No deleted suppliers found</h2>
            <p className="mt-2 text-sm text-slate-500">Deleted suppliers will appear here when available.</p>
          </Card>
        )
      ) : (
        <div className="space-y-4">
          {suppliers.map((supplier) => (
            <Card key={supplier.publicId} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{supplier.supplierName || "Unnamed supplier"}</h2>
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">Deleted</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{supplier.companyName || "—"}</p>
                  <p className="mt-2 text-xs text-slate-500">Supplier Code: {supplier.supplierCode || "—"} · Public ID: {supplier.publicId}</p>
                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div><dt className="text-slate-500">Supplier Type</dt><dd className="font-medium text-slate-800">{String(supplier.supplierType || "—").replaceAll("_", " ")}</dd></div>
                    <div><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-800">{supplier.phone || "—"}</dd></div>
                    <div><dt className="text-slate-500">Deleted At</dt><dd className="font-medium text-slate-800">{formatDate(supplier.deletedAt)}</dd></div>
                  </dl>
                </div>
                <Button type="button" onClick={() => setSupplierToRestore(supplier)}>Restore Supplier</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {supplierToRestore && (
        <SupplierRestoreDialog
          supplier={supplierToRestore}
          onClose={() => setSupplierToRestore(null)}
          onRestored={handleRestored}
        />
      )}
    </main>
  );
}
