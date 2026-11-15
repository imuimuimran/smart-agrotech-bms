import { useEffect, useState } from "react";
import { CustomerService } from "../../services/customerService";
import { Button } from "../../components/ui/Button";

function getRestoreErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (Array.isArray(data?.errors)) {
    const messages = data.errors
      .map((item) => item?.message || item?.msg || String(item))
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (status === 400) return "The customer could not be restored in its current state.";
  if (status === 401) return "Your session has expired. Sign in again before restoring this customer.";
  if (status === 403) return "Only an ADMIN can restore customers.";
  if (status === 404) return "This customer is no longer in the deleted customers list. Refresh and try again.";
  if (status === 409) return data?.message || "The customer could not be restored because its phone number conflicts with an existing customer.";
  if (!error?.response) return "Could not reach the server. Check your connection and try again.";

  return error?.message || "Customer restoration failed. Please try again.";
}

export default function CustomerRestoreDialog({ customer, onClose, onRestored }) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!customer) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isRestoring) onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [customer, isRestoring, onClose]);

  if (!customer) return null;

  async function handleRestore() {
    if (isRestoring || !customer?.publicId) return;

    setIsRestoring(true);
    setErrorMessage("");

    try {
      const response = await CustomerService.restoreCustomer(customer.publicId);
      const restoredCustomer = response?.data;

      if (!restoredCustomer || restoredCustomer.publicId !== customer.publicId) {
        throw new Error("The server did not return the restored customer record.");
      }

      onRestored?.(restoredCustomer);
    } catch (error) {
      setErrorMessage(getRestoreErrorMessage(error));
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isRestoring) onClose?.();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="customer-restore-title"
        aria-describedby="customer-restore-description"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="customer-restore-title" className="text-lg font-semibold text-slate-900">
          Restore Customer?
        </h2>
        <p id="customer-restore-description" className="mt-2 text-sm text-slate-600">
          Restore this customer? The record will become available again in the normal Customers list.
        </p>

        <dl className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Customer</dt>
            <dd className="text-right font-medium text-slate-900">{customer.name || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Public ID</dt>
            <dd className="font-mono text-slate-900">{customer.publicId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Phone</dt>
            <dd className="text-slate-900">{customer.phone || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Deleted At</dt>
            <dd className="text-right text-slate-900">
              {customer.deletedAt ? new Date(customer.deletedAt).toLocaleString() : "—"}
            </dd>
          </div>
        </dl>

        {errorMessage && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={isRestoring} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={isRestoring} onClick={handleRestore}>
            {isRestoring ? "Restoring..." : "Confirm Restore"}
          </Button>
        </div>
      </section>
    </div>
  );
}
