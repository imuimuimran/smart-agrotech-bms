import { useEffect, useState } from "react";
import { SupplierService } from "../../services/supplierService";
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

  if (status === 400) return "The supplier could not be restored in its current state.";
  if (status === 401) return "Your session has expired. Sign in again before restoring this supplier.";
  if (status === 403) return "Only an ADMIN can restore suppliers.";
  if (status === 404) return "This supplier is no longer in the deleted suppliers list. Refresh and try again.";
  if (status === 409) return "The supplier could not be restored because of a data conflict.";
  if (!error?.response) return "Could not reach the server. Check your connection and try again.";

  return error?.message || "Supplier restoration failed. Please try again.";
}

export default function SupplierRestoreDialog({ supplier, onClose, onRestored }) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!supplier) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isRestoring) onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [supplier, isRestoring, onClose]);

  if (!supplier) return null;

  async function handleRestore() {
    if (isRestoring || !supplier?.publicId) return;

    setIsRestoring(true);
    setErrorMessage("");

    try {
      const response = await SupplierService.restoreSupplier(supplier.publicId);
      const restoredSupplier = response?.data;

      if (!restoredSupplier || restoredSupplier.publicId !== supplier.publicId) {
        throw new Error("The server did not return the restored supplier record.");
      }

      onRestored?.(restoredSupplier);
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
        aria-labelledby="supplier-restore-title"
        aria-describedby="supplier-restore-description"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="supplier-restore-title" className="text-lg font-semibold text-slate-900">
          Restore Supplier?
        </h2>
        <p id="supplier-restore-description" className="mt-2 text-sm text-slate-600">
          You are about to restore this supplier. It will become available again in the normal Suppliers list and related workflows.
        </p>

        <dl className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Supplier</dt>
            <dd className="text-right font-medium text-slate-900">{supplier.supplierName || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Public ID</dt>
            <dd className="font-mono text-slate-900">{supplier.publicId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Supplier Code</dt>
            <dd className="text-slate-900">{supplier.supplierCode || "—"}</dd>
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
