import { useEffect, useState } from "react";
import { SupplierService } from "../../services/supplierService";
import { Button } from "../../components/ui/Button";

function getDeleteErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (Array.isArray(data?.errors)) {
    const messages = data.errors
      .map((item) => item?.message || item?.msg || String(item))
      .filter(Boolean);

    if (messages.length) return messages.join(" ");
  }

  // Prefer the backend's message because it may explain a financial restriction,
  // such as an outstanding payable balance.
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (status === 400 || status === 409) {
    return "This supplier cannot be deleted because the server has restricted the operation. Check its financial records and try again.";
  }

  if (status === 401) {
    return "Your session has expired. Sign in again before deleting this supplier.";
  }

  if (status === 403) {
    return "You do not have permission to delete suppliers. Only an ADMIN can delete a supplier.";
  }

  if (status === 404) {
    return "This supplier could not be found. Refresh the page and try again.";
  }

  if (!error?.response) {
    return "Could not reach the server. Check your connection and try again.";
  }

  return error?.message || "Supplier deletion failed. Please try again.";
}

/**
 * Shared confirmation dialog used by the Suppliers list and details pages.
 * Props: supplier, onClose(), onDeleted(supplier).
 */
export default function SupplierDeleteDialog({
  supplier,
  onClose,
  onDeleted,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!supplier) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isDeleting) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [supplier, isDeleting, onClose]);

  if (!supplier) return null;

  async function handleConfirm() {
    if (isDeleting || !supplier?.publicId) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      // Supplier deletion is a soft delete and the backend expects publicId.
      await SupplierService.deleteSupplier(supplier.publicId);
      onDeleted?.(supplier);
    } catch (error) {
      setErrorMessage(getDeleteErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  const payable = Number(supplier.currentPayable);
  const hasOutstandingPayable = Number.isFinite(payable) && payable > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onClose?.();
        }
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="supplier-delete-title"
        aria-describedby="supplier-delete-description"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6"
            />
          </svg>
        </div>

        <h2
          id="supplier-delete-title"
          className="text-xl font-semibold text-slate-900"
        >
          Delete supplier?
        </h2>

        <p
          id="supplier-delete-description"
          className="mt-2 text-sm leading-6 text-slate-600"
        >
          This will soft-delete the supplier from normal supplier listings. The
          database record will not be permanently erased.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">
            {supplier.supplierName || "Unnamed supplier"}
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-slate-500">Supplier ID</dt>
            <dd className="break-all text-slate-800">
              {supplier.publicId || "—"}
            </dd>
            <dt className="text-slate-500">Supplier code</dt>
            <dd className="break-all text-slate-800">
              {supplier.supplierCode || "—"}
            </dd>
            <dt className="text-slate-500">Current payable</dt>
            <dd className="break-all text-slate-800">
              {supplier.currency || "BDT"}{" "}
              {Number.isFinite(payable)
                ? payable.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </dd>
          </dl>
        </div>

        {hasOutstandingPayable && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            This supplier has an outstanding payable balance. The backend may
            reject deletion until the balance is cleared.
          </p>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            disabled={isDeleting}
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="danger"
            disabled={isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? "Deleting…" : "Confirm Delete"}
          </Button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Only an ADMIN can perform this action.
        </p>
      </section>
    </div>
  );
}
