import { LayersPlus, ArchiveRestore, Eye, Trash, SquarePen, Funnel } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { SupplierService } from "../../services/supplierService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../hooks/useAuth";
import SupplierDeleteDialog from "./SupplierDeleteDialog";

const PAGE_SIZE = 10;

const INITIAL_FILTERS = {
  search: "",
  supplierType: "",
  status: "",
  paymentTerms: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

const INITIAL_META = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

const SUPPLIER_TYPES = [
  ["manufacturer", "Manufacturer"],
  ["distributor", "Distributor"],
  ["wholesaler", "Wholesaler"],
  ["importer", "Importer"],
  ["local_vendor", "Local Vendor"],
  ["service_provider", "Service Provider"],
];

const PAYMENT_TERMS = [
  "Cash",
  "7 Days",
  "15 Days",
  "30 Days",
  "45 Days",
  "60 Days",
  "90 Days",
];

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item) => item?.message || item?.msg || String(item))
      .join(" ");
  }

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (error?.message === "Network Error") {
    return "Could not connect to the server. Check that the backend is running.";
  }

  return error?.message || "Unable to load suppliers. Please try again.";
}

function getRole(user) {
  const rawRole =
    user?.role?.name ??
    user?.role ??
    user?.user?.role?.name ??
    user?.user?.role ??
    user?.userRole ??
    user?.roleName ??
    "";

  return String(rawRole).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function displayValue(value) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  return String(value);
}

function formatMoney(value, currency = "BDT") {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return `${currency} ${amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-100 text-emerald-800",
    inactive: "bg-slate-100 text-slate-700",
    blacklisted: "bg-red-100 text-red-800",
  };

  const normalized = String(status || "").toLowerCase();

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[normalized] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function SupplierTypeLabel({ value }) {
  const labels = {
    manufacturer: "Manufacturer",
    distributor: "Distributor",
    wholesaler: "Wholesaler",
    importer: "Importer",
    local_vendor: "Local Vendor",
    service_provider: "Service Provider",
  };

  return labels[value] || displayValue(value);
}

function SupplierCard({ supplier, canDelete, onDelete }) {
  const contactName =
    supplier?.contactPerson?.name ||
    supplier?.contactPerson?.designation ||
    "";

  const currency = supplier?.currency || "BDT";

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="wrap-break-words text-lg font-semibold text-slate-900">
              {displayValue(supplier.supplierName)}
            </h2>

            <StatusBadge status={supplier.status} />
          </div>

          <p className="mt-1 wrap-break-words text-sm text-slate-500">
            {displayValue(supplier.companyName)}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Supplier Code: {displayValue(supplier.supplierCode)}
            {" · "}
            ID: {displayValue(supplier.publicId)}
          </p>
        </div>

        <div className="text-sm sm:text-right">
          <p className="text-slate-500">Supplier Type</p>
          <p className="mt-1 font-medium text-slate-800">
            <SupplierTypeLabel value={supplier.supplierType} />
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Contact Person
          </p>
          <p className="mt-1 wrap-break-words text-sm text-slate-800">
            {displayValue(contactName)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Phone
          </p>
          <p className="mt-1 wrap-break-words text-sm text-slate-800">
            {displayValue(supplier.phone)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Email
          </p>
          <p className="mt-1 break-all text-sm text-slate-800">
            {displayValue(supplier.email)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Payment Terms
          </p>
          <p className="mt-1 text-sm text-slate-800">
            {displayValue(supplier.paymentTerms)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Current Payable
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatMoney(supplier.currentPayable, currency)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Available Credit
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-700">
            {formatMoney(supplier.availableCredit, currency)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {supplier.publicId && (
          <Link
            to={`/suppliers/${encodeURIComponent(supplier.publicId)}`}
            // className="inline-flex text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
            className="inline-flex items-center justify-center rounded-lg border px-4 py-2.5 border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {/* View Details */}
            <Eye className="w-4 h-4 mr-2" /> <span>View Details</span>
          </Link>
        )}
        
        {canDelete && (
          <Link
          to={`/suppliers/${encodeURIComponent(supplier.publicId)}/edit`}
          className="inline-flex items-center justify-center rounded-lg border px-4 py-2.5 border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <SquarePen className="w-4 h-4 mr-2" /> <span>Edit Supplier</span>
        </Link>
        )}
        

        {canDelete && (
          <Button
            type="button"
            variant="danger"
            onClick={() => onDelete?.(supplier)}
          >
            {/* Delete Supplier */}
            <Trash className="w-4 h-4 mr-2" /> <span>Delete Supplier</span>
          </Button>
        )}
      </div>

    </Card>
  );
}

export default function SuppliersPage() {
  const { user: authenticatedUser } = useAuth();
  const location = useLocation();
  const canDeleteSupplier = getRole(authenticatedUser) === "admin";

  const [suppliers, setSuppliers] = useState([]);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || ""
  );
  const [meta, setMeta] = useState({ ...INITIAL_META });

  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState({
    ...INITIAL_FILTERS,
  });

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        sortBy: appliedFilters.sortBy,
        sortOrder: appliedFilters.sortOrder,
      };

      if (appliedFilters.search.trim()) {
        params.search = appliedFilters.search.trim();
      }

      if (appliedFilters.supplierType) {
        params.supplierType = appliedFilters.supplierType;
      }

      if (appliedFilters.status) {
        params.status = appliedFilters.status;
      }

      if (appliedFilters.paymentTerms) {
        params.paymentTerms = appliedFilters.paymentTerms;
      }

      const result = await SupplierService.getSuppliers(params);

      if (!Array.isArray(result?.data)) {
        throw new Error("Unexpected Suppliers API response.");
      }

      setSuppliers(result.data);
      setMeta(result.meta || { ...INITIAL_META, page });
    } catch (err) {
      setSuppliers([]);
      setMeta({ ...INITIAL_META, page });
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
        void loadSuppliers();
    }, 0);

    return () => {
        clearTimeout(timer);
    };
  }, [loadSuppliers, retry]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleApplyFilters(event) {
    event.preventDefault();

    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function handleResetFilters() {
    const resetFilters = { ...INITIAL_FILTERS };

    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setPage(1);
  }

  const totalPages = Number(meta.totalPages) || 0;
  const total = Number(meta.total) || 0;
  const currentPage = Number(meta.page) || page;

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="mt-1 text-sm text-gray-600">View and search registered suppliers.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canDeleteSupplier &&(
            <Link
            to="/suppliers/create"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {/* + Create Supplier */}
            <LayersPlus className="w-4 h-4 mr-2" /> <span>Create Supplier</span>
          </Link>
          )}
          
          {canDeleteSupplier && (
            <Link
              to="/suppliers/restore"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
            >
              {/* Restore Deleted Suppliers */}
              <ArchiveRestore className="w-4 h-4 mr-2" /> <span>Restore Deleted Suppliers</span>
            </Link>
          )}
        </div>
      </header>

      <Card className="p-5">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div>
            <label
              htmlFor="search"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Search suppliers
            </label>

            <input
              id="search"
              name="search"
              type="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Supplier name, company, phone or email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="supplierType"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Supplier Type
              </label>
              <select
                id="supplierType"
                name="supplierType"
                value={filters.supplierType}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All types</option>
                {SUPPLIER_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="paymentTerms"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Payment Terms
              </label>
              <select
                id="paymentTerms"
                name="paymentTerms"
                value={filters.paymentTerms}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All payment terms</option>
                {PAYMENT_TERMS.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sortBy"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Sort By
              </label>
              <select
                id="sortBy"
                name="sortBy"
                value={filters.sortBy}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="createdAt">Date Added</option>
                <option value="supplierName">Supplier Name</option>
                <option value="currentPayable">Current Payable</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label
                htmlFor="sortOrder"
                className="sr-only"
              >
                Sort Order
              </label>
              <select
                id="sortOrder"
                name="sortOrder"
                value={filters.sortOrder}
                onChange={handleFilterChange}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <Button type="submit"><Funnel className="w-4 h-4 mr-2" /> <span>Apply filters</span></Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleResetFilters}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {successMessage && (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <p>{error}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {suppliers.length > 0 ? (
            <div className="space-y-4">
              {suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.publicId}
                  supplier={supplier}
                  canDelete={canDeleteSupplier}
                  onDelete={setSupplierToDelete}
                />
              ))}
            </div>
          ) : (
            !error && (
              <Card className="p-10 text-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  {appliedFilters.search ||
                  appliedFilters.supplierType ||
                  appliedFilters.status ||
                  appliedFilters.paymentTerms
                    ? "No matching suppliers found"
                    : "No suppliers found"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Try changing your search or filter criteria.
                </p>
              </Card>
            )
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Page {currentPage} of {totalPages} · {total} suppliers
            </p>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isLoading || currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </Button>

              <Button
                type="button"
                variant="secondary"
                disabled={
                  isLoading ||
                  totalPages === 0 ||
                  currentPage >= totalPages
                }
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {canDeleteSupplier && supplierToDelete && (
        <SupplierDeleteDialog
          supplier={supplierToDelete}
          onClose={() => setSupplierToDelete(null)}
          onDeleted={(deletedSupplier) => {
            setSupplierToDelete(null);
            setSuccessMessage(
              `${deletedSupplier.supplierName || "Supplier"} was deleted successfully.`
            );
            setRetry((value) => value + 1);
          }}
        />
      )}
    </main>
  );
}