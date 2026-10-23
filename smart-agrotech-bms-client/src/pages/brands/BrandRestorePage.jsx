import { useEffect, useState } from "react";
import BrandService from "../../services/brandService";
import { Button } from "../../components/ui/Button";

function getRestoreErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  if (status === 400) return data?.message || "This brand is not currently deleted.";
  if (status === 401) return "Your session has expired. Sign in again before restoring this brand.";
  if (status === 403) return "Only an ADMIN can restore a brand.";
  if (status === 404) return "The deleted brand could not be found. Refresh and try again.";
  if (status === 409) return data?.message || "The brand could not be restored because of a conflict.";
  if (!error?.response) return "Could not reach the server. Check your connection and try again.";
  return data?.message || error?.message || "Brand restoration failed. Please try again.";
}

/**
 * Props: brand (soft-deleted brand), onClose(), onRestored(restoredBrand).
 * Important: normal GET /brands excludes deleted records. The parent must obtain
 * this brand from an existing authorized source; this dialog does not invent one.
 */
export default function BrandRestoreDialog({ brand, onClose, onRestored }) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!brand) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !isRestoring) onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [brand, isRestoring, onClose]);

  if (!brand) return null;

  async function handleRestore() {
    if (isRestoring) return;
    setIsRestoring(true);
    setErrorMessage("");
    try {
      const response = await BrandService.restoreBrand(brand.publicId);
      onRestored?.(response?.data ?? response);
    } catch (error) {
      setErrorMessage(getRestoreErrorMessage(error));
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isRestoring) onClose?.();
      }}
    >
      <section role="alertdialog" aria-modal="true"
        aria-labelledby="brand-restore-title" aria-describedby="brand-restore-description"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="brand-restore-title" className="text-lg font-semibold text-slate-900">
          Restore brand?
        </h2>
        <p id="brand-restore-description" className="mt-2 text-sm leading-6 text-slate-600">
          Restore <strong>{brand.brandName}</strong> ({brand.publicId}
          {brand.brandCode ? ` · ${brand.brandCode}` : ""})? It will become available
          again in the active Brands list and product workflows.
        </p>
        {errorMessage && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={isRestoring} onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" disabled={isRestoring} loading={isRestoring} onClick={handleRestore}>
            {isRestoring ? "Restoring…" : "Restore brand"}
          </Button>
        </div>
      </section>
    </div>
  );
}
