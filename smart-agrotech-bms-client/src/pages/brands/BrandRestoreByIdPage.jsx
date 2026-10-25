
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
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

  return String(rawRole)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export default function BrandRestoreByIdPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [publicId, setPublicId] = useState("");
  const [brandToRestore, setBrandToRestore] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const isAdmin = getUserRole(user) === "admin";

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Access denied
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Only an ADMIN can restore deleted brands.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/brands")}
        >
          Back to brands
        </Button>
      </main>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSuccessMessage("");

    const normalizedId = publicId.trim();
    if (!normalizedId) return;

    // The deleted brand's details are not available from the normal
    // Brands list, so use the known publicId for confirmation.
    setBrandToRestore({
      publicId: normalizedId,
      brandName: normalizedId,
    });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Restore deleted brand
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the public ID of a brand you know was deleted.
          The server will verify whether it can be restored.
        </p>
      </div>

      {successMessage && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="brand-public-id"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Brand public ID
            </label>
            <input
              id="brand-public-id"
              name="publicId"
              type="text"
              value={publicId}
              onChange={(event) => setPublicId(event.target.value)}
              placeholder="e.g. BRD-100001"
              autoComplete="off"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={!publicId.trim()}>
              Continue to confirmation
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/brands")}
            >
              Back to brands
            </Button>
          </div>
        </form>
      </section>

      {brandToRestore && (
        <BrandRestoreDialog
          brand={brandToRestore}
          onClose={() => setBrandToRestore(null)}
          onRestored={() => {
            const restoredId = brandToRestore.publicId;
            setBrandToRestore(null);
            setPublicId("");
            setSuccessMessage(
              `Brand ${restoredId} was restored successfully.`
            );
          }}
        />
      )}
    </main>
  );
}
