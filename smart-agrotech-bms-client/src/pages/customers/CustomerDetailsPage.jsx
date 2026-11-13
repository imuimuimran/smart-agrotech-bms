
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { CustomerService } from "../../services/customerService";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) return String(value);

  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(amount);
};

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to load customer details. Please try again."
  );
};

const getAddressText = (address) => {
  if (!address) return "—";

  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ") || "—";
};

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 wrap-break-words text-sm text-gray-900">
        {value || "—"}
      </dd>
    </div>
  );
}

function AddressCard({ address, title }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>

        {address?.label && (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
            {address.label}
          </span>
        )}

        {address?.isDefault && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
            Default
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-6 text-gray-700">
        {getAddressText(address)}
      </p>
    </div>
  );
}

export default function CustomerDetailsPage() {
  const { publicId } = useParams();

  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const location = useLocation();
  const successMessage = location.state?.successMessage;

  const loadCustomer = useCallback(async () => {
    if (!publicId) {
      setCustomer(null);
      setError("Customer ID was not provided.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await CustomerService.getCustomerById(publicId);

      // Supports the standard API envelope:
      // { success, message, data: customer }
      // Also supports an apiClient that returns the unwrapped response.
      const customerData =
        response?.data?.data ??
        response?.data ??
        response;

      if (!customerData || !customerData.publicId) {
        throw new Error("Customer details could not be found.");
      }

      setCustomer(customerData);
    } catch (err) {
      setCustomer(null);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      if (!isActive) return;
      await loadCustomer();
    };

    load();

    return () => {
      isActive = false;
    };
  }, [loadCustomer, retryKey]);

  const handleRetry = () => {
    setRetryKey((previous) => previous + 1);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-75 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-600">
            Loading customer details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <Link
          to="/customers"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          ← Back to Customers
        </Link>

        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800">
            Unable to load customer
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error || "Customer details are unavailable."}
          </p>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const shippingAddresses = Array.isArray(customer.shippingAddresses)
    ? customer.shippingAddresses
    : [];

  const statusClass =
    customer.status === "active"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-gray-100 text-gray-700";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            to="/customers"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            ← Back to Customers
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Customer Details
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Customer ID: {customer.publicId}
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium capitalize ${statusClass}`}
        >
          {customer.status || "Unknown"}
        </span>
      </div>

      {successMessage && (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {/* Basic information */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="border-b border-gray-100 pb-3 text-lg font-semibold text-gray-900">
          Basic Information
        </h2>

        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Customer Name" value={customer.name} />
          <DetailItem label="Customer ID" value={customer.publicId} />
          <DetailItem label="Phone Number" value={customer.phone} />
          <DetailItem label="Email Address" value={customer.email} />
          <DetailItem label="Company Name" value={customer.companyName} />
          <DetailItem label="Customer Type" value={customer.customerType} />
          <DetailItem
            label="Membership Level"
            value={customer.membershipLevel}
          />
          <DetailItem
            label="Account Status"
            value={customer.status}
          />
        </dl>
      </section>

      {/* Financial information */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="border-b border-gray-100 pb-3 text-lg font-semibold text-gray-900">
          Account Information
        </h2>

        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem
            label="Credit Limit"
            value={formatCurrency(customer.creditLimit)}
          />
          <DetailItem
            label="Current Balance"
            value={formatCurrency(customer.currentBalance)}
          />
          <DetailItem
            label="Created At"
            value={formatDate(customer.createdAt)}
          />
          <DetailItem
            label="Last Updated"
            value={formatDate(customer.updatedAt)}
          />
        </dl>
      </section>

      {/* Billing address */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Billing Address
        </h2>

        <AddressCard
          title="Billing Address"
          address={customer.billingAddress}
        />
      </section>

      {/* Shipping addresses */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Shipping Addresses
          </h2>

          <span className="text-sm text-gray-500">
            {shippingAddresses.length} address
            {shippingAddresses.length === 1 ? "" : "es"}
          </span>
        </div>

        {shippingAddresses.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {shippingAddresses.map((address, index) => (
              <AddressCard
                key={address._id || address.id || index}
                title={`Shipping Address ${index + 1}`}
                address={address}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
            No shipping addresses have been added.
          </p>
        )}
      </section>
    </div>
  );
}
