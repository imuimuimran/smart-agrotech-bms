import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { CustomerService } from "../../services/customerService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import CustomerDeleteDialog from "./CustomerDeleteDialog";

const PAGE_SIZE = 10;

const INITIAL_FILTERS = {
  search: "",
  companyName: "",
  status: "",
  customerType: "",
  membershipLevel: "",
};

const INITIAL_META = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

const CUSTOMER_TYPES = [
  ["individual", "Individual"],
  ["business", "Business"],
  ["wholesale", "Wholesale"],
  ["retail", "Retail"],
  ["Government", "Government"],
];

const MEMBERSHIP_LEVELS = ["Bronze", "Silver", "Gold", "Platinum"];

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

  return error?.message || "Unable to load customers. Please try again.";
}

function displayValue(value) {
  return value === undefined || value === null || value === ""
    ? "—"
    : String(value);
}

function formatMoney(value, currency = "BDT") {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${currency} ${amount.toLocaleString("en-BD", {
      maximumFractionDigits: 2,
    })}`
    : "—";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-BD");
}

function getStatusVariant(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "success";
    case "inactive":
      return "warning";
    default:
      return "neutral";
  }
}

function CustomerCard({ customer, canDelete, onDelete, }) {
  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="wrap-break-words text-lg font-semibold text-slate-900">
              {displayValue(customer.name)}
            </h2>
            <Badge variant={getStatusVariant(customer.status)}>
              {displayValue(customer.status)}
            </Badge>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {displayValue(customer.publicId)}
          </p>
        </div>
        <Badge variant="neutral">
          {displayValue(customer.membershipLevel)} Member
        </Badge>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</dt>
          <dd className="mt-1 wrap-break-words text-sm text-slate-800">{displayValue(customer.phone)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
          <dd className="mt-1 wrap-break-words text-sm text-slate-800">{displayValue(customer.email)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Company</dt>
          <dd className="mt-1 wrap-break-words text-sm text-slate-800">{displayValue(customer.companyName)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer type</dt>
          <dd className="mt-1 wrap-break-words text-sm capitalize text-slate-800">{displayValue(customer.customerType)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Credit limit</dt>
          <dd className="mt-1 text-sm text-slate-800">{formatMoney(customer.creditLimit)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Current balance</dt>
          <dd className="mt-1 text-sm text-slate-800">{formatMoney(customer.currentBalance)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Registered</dt>
          <dd className="mt-1 text-sm text-slate-800">{formatDate(customer.createdAt)}</dd>
        </div>
      </dl>

      {customer.publicId && (
        <Link
          to={`/customers/${encodeURIComponent(customer.publicId)}`}
          className="mt-3 inline-flex text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
        >
          View details
        </Link>
      )}

      {canDelete && (
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="danger"
            onClick={() => onDelete(customer)}
          >
            Delete Customer
          </Button>
        </div>
      )}
    </Card>
  );
}

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

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState({ ...INITIAL_FILTERS });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ ...INITIAL_META });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const { user } = useAuth();

  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deleteNotice, setDeleteNotice] = useState("");

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

  const canCreateCustomer = ["admin", "moderator"].includes(role);

  const canDeleteCustomers = getUserRole(user) === "admin";

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      // These are the filters explicitly supported by the Customers API.
      for (const key of [
        "search",
        "companyName",
        "status",
        "customerType",
        "membershipLevel",
      ]) {
        const value = appliedFilters[key];
        if (typeof value === "string" && value.trim()) {
          params[key] = value.trim();
        }
      }

      const response = await CustomerService.getCustomers(params);

      if (!Array.isArray(response?.data)) {
        throw new Error("The Customers API returned an unexpected response format.");
      }

      setCustomers(response.data);
      setMeta({
        page: Number(response.meta?.page ?? page),
        limit: Number(response.meta?.limit ?? PAGE_SIZE),
        total: Number(response.meta?.total ?? response.data.length),
        totalPages: Number(response.meta?.totalPages ?? 0),
      });
    } catch (err) {
      setCustomers([]);
      setMeta({ ...INITIAL_META, page });
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) void loadCustomers();
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadCustomers, retry]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function handleResetFilters() {
    const reset = { ...INITIAL_FILTERS };
    setFilters(reset);
    setAppliedFilters(reset);
    setPage(1);
  }

  function handleRetry() {
    setIsLoading(true);
    setError("");
    setRetry((current) => current + 1);
  }

  function handleCustomerDeleted() {
    const deletedName = customerToDelete?.name || "Customer";

    setCustomerToDelete(null);
    setDeleteNotice(`${deletedName} was deleted successfully.`);

    // If the deleted customer was the only item on this page,
    // move back one page when possible.
    if (customers.length === 1 && page > 1) {
      setPage((current) => Math.max(1, current - 1));
    } else {
      setRetry((current) => current + 1);
    }
  }

  function handleStaleCustomer() {
    setCustomerToDelete(null);
    setDeleteNotice(
      "This customer is no longer available. The customer list has been refreshed."
    );

    setRetry((current) => current + 1);
  }

  const currentPage = Number(meta.page) || page;
  const totalPages = Number(meta.totalPages) || 0;
  const total = Number(meta.total) || 0;
  const hasFilters = Object.values(appliedFilters).some((value) => Boolean(value));

  return (
    <main className="space-y-6">
      {/* <header>
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">
          View and search registered customers.
        </p>
      </header> */}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">
            View and search registered customers.
          </p>
        </div>

        {canCreateCustomer && (
          <Link
            to="/customers/new"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Create Customer
          </Link>
        )}
      </header>

      {deleteNotice && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p>{deleteNotice}</p>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setDeleteNotice("")}
          >
            Dismiss
          </Button>
        </div>
      )}

      <Card className="p-5">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="customer-search"
              label="Search customers"
              name="search"
              type="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Name, phone, email or company"
            />
            <Input
              id="customer-company"
              label="Company name"
              name="companyName"
              value={filters.companyName}
              onChange={handleFilterChange}
              placeholder="Filter by company name"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="customer-status" className="mb-2 block text-sm font-medium text-slate-700">Status</label>
              <select id="customer-status" name="status" value={filters.status} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label htmlFor="customer-type" className="mb-2 block text-sm font-medium text-slate-700">Customer type</label>
              <select id="customer-type" name="customerType" value={filters.customerType} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
                <option value="">All customer types</option>
                {CUSTOMER_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="customer-membership" className="mb-2 block text-sm font-medium text-slate-700">Membership level</label>
              <select id="customer-membership" name="membershipLevel" value={filters.membershipLevel} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
                <option value="">All membership levels</option>
                {MEMBERSHIP_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit">Apply Filters</Button>
            <Button type="button" variant="secondary" onClick={handleResetFilters}>Reset</Button>
          </div>
        </form>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <p>{error}</p>
          <Button type="button" variant="secondary" className="mt-3" onClick={handleRetry}>Retry</Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner label="Loading customers..." /></div>
      ) : customers.length > 0 ? (
        <div className="space-y-4">
          {/* {customers.map((customer, index) => (
            <CustomerCard key={customer.publicId || `${customer.phone || "customer"}-${index}`} customer={customer} />
          ))} */}
          {customers.map((customer, index) => (
            <CustomerCard
              key={customer.publicId || `${customer.phone || "customer"}-${index}`}
              customer={customer}
              canDelete={canDeleteCustomers}
              onDelete={(selectedCustomer) => {
                setDeleteNotice("");
                setCustomerToDelete(selectedCustomer);
              }}
            />
          ))}
        </div>
      ) : !error ? (
        <Card className="p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-800">
            {hasFilters ? "No matching customers found" : "No customers found"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">Try changing your search or filter criteria.</p>
        </Card>
      ) : null}

      {!isLoading && !error && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Page {currentPage} of {totalPages} · {total} customers
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
            <Button type="button" variant="secondary" disabled={totalPages === 0 || currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
          </div>
        </div>
      )}

      {customerToDelete && (
        <CustomerDeleteDialog
          customer={customerToDelete}
          onClose={() => setCustomerToDelete(null)}
          onDeleted={handleCustomerDeleted}
          onStale={handleStaleCustomer}
        />
      )}

    </main>
  );
}

export default CustomersPage;
