import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { CustomerService } from "../../services/customerService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import CustomerRestoreDialog from "./CustomerRestoreDialog";

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
  if (status === 403) return "Only an ADMIN can view deleted customers.";
  if (!error?.response) return "Could not connect to the server. Check that the backend is running.";
  return data?.message || error?.message || "Unable to load deleted customers.";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function formatMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `BDT ${amount.toLocaleString("en-BD", { maximumFractionDigits: 2 })}` : "—";
}

export default function CustomerRestorePage() {
  const { user } = useAuth();
  const isAdmin = getRole(user) === "admin";

  const [customers, setCustomers] = useState([]);
  const [customerToRestore, setCustomerToRestore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const loadDeletedCustomers = useCallback(async (isActive) => {
    try {
      setError("");
      const response = await CustomerService.getDeletedCustomers();
      if (!isActive()) return;

      if (!Array.isArray(response?.data)) {
        throw new Error("Unexpected deleted customers API response.");
      }
      setCustomers(response.data);
    } catch (loadError) {
      if (!isActive()) return;
      setCustomers([]);
      setError(getErrorMessage(loadError));
    } finally {
      if (isActive()) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return undefined;

    let active = true;
    const timer = window.setTimeout(() => {
      void loadDeletedCustomers(() => active);
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isAdmin, loadDeletedCustomers, reloadKey]);

  if (!isAdmin) return <Navigate to="/forbidden" replace />;

  const handleRestored = (restoredCustomer) => {
    setCustomerToRestore(null);
    setSuccessMessage(`${restoredCustomer.name || "Customer"} was restored successfully.`);
    setIsLoading(true);
    setReloadKey((value) => value + 1);
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Restore Deleted Customers</h1>
          <p className="mt-1 text-sm text-slate-500">Review deleted customers and restore records when needed.</p>
        </div>
        <Link to="/customers" className="text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900">
          Back to Customers
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
      ) : customers.length === 0 ? (
        !error && (
          <Card className="p-10 text-center">
            <h2 className="text-lg font-semibold text-slate-800">No deleted customers found</h2>
            <p className="mt-2 text-sm text-slate-500">Deleted customers will appear here when available.</p>
          </Card>
        )
      ) : (
        <div className="space-y-4">
          {customers.map((customer) => (
            <Card key={customer.publicId} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{customer.name || "Unnamed customer"}</h2>
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">Deleted</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{customer.companyName || "—"}</p>
                  <p className="mt-2 text-xs text-slate-500">Public ID: {customer.publicId}</p>
                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-800">{customer.phone || "—"}</dd></div>
                    <div><dt className="text-slate-500">Email</dt><dd className="break-all font-medium text-slate-800">{customer.email || "—"}</dd></div>
                    <div><dt className="text-slate-500">Current Balance</dt><dd className="font-medium text-slate-800">{formatMoney(customer.currentBalance)}</dd></div>
                    <div><dt className="text-slate-500">Deleted At</dt><dd className="font-medium text-slate-800">{formatDate(customer.deletedAt)}</dd></div>
                  </dl>
                </div>
                <Button type="button" onClick={() => setCustomerToRestore(customer)}>
                  Restore Customer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {customerToRestore && (
        <CustomerRestoreDialog
          customer={customerToRestore}
          onClose={() => setCustomerToRestore(null)}
          onRestored={handleRestored}
        />
      )}
    </main>
  );
}
