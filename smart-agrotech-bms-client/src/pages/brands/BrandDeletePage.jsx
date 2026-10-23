import { useEffect, useState } from "react";
import BrandService from "../../services/brandService";
import { Button } from "../../components/ui/Button";

function getDeleteErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 400) {
    return data?.message ||
      "This brand cannot be deleted in its current state. It may already be deleted or may be restricted by the server.";
  }
  if (status === 401) {
    return "Your session has expired. Sign in again before deleting this brand.";
  }
  if (status === 403) {
    return "You do not have permission to delete brands. Only an ADMIN can delete a brand.";
  }
  if (status === 404) {
    return "This brand could not be found. Refresh the page and try again.";
  }
  if (status === 409) {
    return data?.message || "The brand cannot be deleted because of a conflict.";
  }
  if (!error?.response) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return data?.message || error?.message || "Brand deletion failed. Please try again.";
}

/**
 * Confirmation dialog for the Brands soft-delete endpoint.
 * Props: brand, onClose, onDeleted(brand)
 */
export default function BrandDeletePage({ brand, onClose, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!brand) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isDeleting) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [brand, isDeleting, onClose]);

  if (!brand) return null;

  async function handleConfirm() {
    if (isDeleting) return;
    setIsDeleting(true);
    setErrorMessage("");
    try {
      // Backend expects publicId and returns no deleted document (data: null).
      await BrandService.deleteBrand(brand.publicId);
      onDeleted?.(brand);
    } catch (error) {
      setErrorMessage(getDeleteErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) onClose?.();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="brand-delete-title"
        aria-describedby="brand-delete-description"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6" />
          </svg>
        </div>
        <h2 id="brand-delete-title" className="text-xl font-semibold text-slate-900">Delete brand?</h2>
        <p id="brand-delete-description" className="mt-2 text-sm leading-6 text-slate-600">
          This will soft-delete the brand from normal listings. It will not permanently erase the record.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">{brand.brandName || "Unnamed brand"}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-slate-500">Brand ID</dt><dd className="break-all text-slate-800">{brand.publicId}</dd>
            <dt className="text-slate-500">Brand code</dt><dd className="break-all text-slate-800">{brand.brandCode || "—"}</dd>
          </dl>
        </div>

        {errorMessage && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button type="button" variant="secondary" disabled={isDeleting} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" disabled={isDeleting} loading={isDeleting} onClick={handleConfirm}>
            {isDeleting ? "Deleting…" : "Delete brand"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-500">Only an ADMIN can perform this action.</p>
      </section>
    </div>
  );
}
