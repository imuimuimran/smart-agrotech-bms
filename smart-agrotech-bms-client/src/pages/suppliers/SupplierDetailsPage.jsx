import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { SupplierService } from "../../services/supplierService";

import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const displayValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not provided";
  }

  return value;
};

const formatMoney = (amount, currency = "BDT") => {
  if (amount === null || amount === undefined) {
    return "Not provided";
  }

  return `${currency} ${Number(amount).toLocaleString()}`;
};

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 font-medium text-gray-900">
        {displayValue(value)}
      </p>
    </div>
  );
}

export default function SupplierDetailsPage() {
  const { id } = useParams();

  const [supplier, setSupplier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const loadSupplier = useCallback(async () => {
    if (!id) {
      setSupplier(null);
      setError("Supplier identifier is missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    setSupplier(null);

    try {
      const result =
        await SupplierService.getSupplierById(id);

      // Confirmed backend response:
      // { success, message, data }
      const supplierData = result?.data;

      if (!supplierData) {
        setSupplier(null);
        setError("Supplier details were not returned.");
        return;
      }

      setSupplier(supplierData);
    } catch (err) {
      setSupplier(null);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load supplier details."
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Deferred request avoids the synchronous setState-in-effect
  // lint warning encountered in the listing page.
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSupplier();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadSupplier, retry]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    const isNotFound =
      error.toLowerCase().includes("not found");

    return (
      <div className="space-y-4">
        <Link
          to="/suppliers"
          className="text-sm text-emerald-700 hover:underline"
        >
          ← Back to Suppliers
        </Link>

        <Card>
          <div className="p-6">
            <p className="text-red-600">{error}</p>

            <div className="mt-4 flex gap-3">
              {!isNotFound && (
                <Button
                  onClick={() =>
                    setRetry((value) => value + 1)
                  }
                >
                  Retry
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={() => {
                  window.history.back();
                }}
              >
                Go Back
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!supplier) {
    return (
      <Card>
        <div className="p-6">
          Supplier not found.
          <Link
            to="/suppliers"
            className="ml-2 text-emerald-700 underline"
          >
            Back to Suppliers
          </Link>
        </div>
      </Card>
    );
  }

  const currency = supplier.currency || "BDT";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/suppliers"
            className="text-sm text-emerald-700 hover:underline"
          >
            ← Back to Suppliers
          </Link>

          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {supplier.supplierName}
          </h1>

          <p className="text-sm text-gray-500">
            Supplier Code: {displayValue(supplier.supplierCode)}
            {" | "}
            ID: {displayValue(supplier.publicId)}
          </p>
        </div>

        <Badge>
          {displayValue(supplier.status)}
        </Badge>
      </div>

      {/* Overview */}
      <Card>
        <div className="p-6">
          <h2 className="mb-5 text-lg font-semibold">
            Supplier Overview
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              label="Supplier Name"
              value={supplier.supplierName}
            />

            <InfoItem
              label="Company Name"
              value={supplier.companyName}
            />

            <InfoItem
              label="Supplier Type"
              value={supplier.supplierType}
            />

            <InfoItem
              label="Contact Person"
              value={supplier.contactPerson?.name}
            />

            <InfoItem
              label="Email"
              value={supplier.email}
            />

            <InfoItem
              label="Phone"
              value={supplier.phone}
            />

            <InfoItem
              label="Alternate Phone"
              value={supplier.alternatePhone}
            />

            <InfoItem
              label="Website"
              value={supplier.website}
            />

            <InfoItem
              label="Payment Terms"
              value={supplier.paymentTerms}
            />
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card>
        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Address Information
          </h2>

          <pre className="whitespace-pre-wrap text-sm text-gray-700">
            {supplier.address
              ? JSON.stringify(supplier.address, null, 2)
              : "Address not provided"}
          </pre>
        </div>
      </Card>

      {/* Financial Information */}
      <Card>
        <div className="p-6">
          <h2 className="mb-5 text-lg font-semibold">
            Financial Information
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              label="Credit Limit"
              value={formatMoney(supplier.creditLimit, currency)}
            />

            <InfoItem
              label="Current Payable"
              value={formatMoney(supplier.currentPayable, currency)}
            />

            <InfoItem
              label="Available Credit"
              value={formatMoney(supplier.availableCredit, currency)}
            />
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <div className="p-6">
          <h2 className="mb-3 text-lg font-semibold">
            Notes
          </h2>

          <p className="whitespace-pre-wrap text-gray-700">
            {displayValue(supplier.notes)}
          </p>
        </div>
      </Card>

    </div>
  );
}