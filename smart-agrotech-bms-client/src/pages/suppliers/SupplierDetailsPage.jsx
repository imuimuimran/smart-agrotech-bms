// import {
//   useCallback,
//   useEffect,
//   useState,
// } from "react";

// import {
//   Link,
//   useParams,
// } from "react-router-dom";

// import { SupplierService } from "../../services/supplierService";

// import { Card } from "../../components/ui/Card";
// import { Button } from "../../components/ui/Button";
// import { Badge } from "../../components/ui/Badge";
// import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

// const displayValue = (value) => {
//   if (
//     value === null ||
//     value === undefined ||
//     value === ""
//   ) {
//     return "Not provided";
//   }

//   return value;
// };

// const formatMoney = (amount, currency = "BDT") => {
//   if (amount === null || amount === undefined) {
//     return "Not provided";
//   }

//   return `${currency} ${Number(amount).toLocaleString()}`;
// };

// function InfoItem({ label, value }) {
//   return (
//     <div>
//       <p className="text-sm text-gray-500">{label}</p>
//       <p className="mt-1 font-medium text-gray-900">
//         {displayValue(value)}
//       </p>
//     </div>
//   );
// }

// export default function SupplierDetailsPage() {
//   const { id } = useParams();

//   const [supplier, setSupplier] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [retry, setRetry] = useState(0);

//   const loadSupplier = useCallback(async () => {
//     if (!id) {
//       setSupplier(null);
//       setError("Supplier identifier is missing.");
//       setIsLoading(false);
//       return;
//     }

//     setIsLoading(true);
//     setError("");
//     setSupplier(null);

//     try {
//       const result =
//         await SupplierService.getSupplierById(id);

//       // Confirmed backend response:
//       // { success, message, data }
//       const supplierData = result?.data;

//       if (!supplierData) {
//         setSupplier(null);
//         setError("Supplier details were not returned.");
//         return;
//       }

//       setSupplier(supplierData);
//     } catch (err) {
//       setSupplier(null);

//       setError(
//         err?.response?.data?.message ||
//         err?.message ||
//         "Unable to load supplier details."
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   }, [id]);

//   // Deferred request avoids the synchronous setState-in-effect
//   // lint warning encountered in the listing page.
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       void loadSupplier();
//     }, 0);

//     return () => clearTimeout(timer);
//   }, [loadSupplier, retry]);

//   if (isLoading) {
//     return <LoadingSpinner />;
//   }

//   if (error) {
//     const isNotFound =
//       error.toLowerCase().includes("not found");

//     return (
//       <div className="space-y-4">
//         <Link
//           to="/suppliers"
//           className="text-sm text-emerald-700 hover:underline"
//         >
//           ← Back to Suppliers
//         </Link>

//         <Card>
//           <div className="p-6">
//             <p className="text-red-600">{error}</p>

//             <div className="mt-4 flex gap-3">
//               {!isNotFound && (
//                 <Button
//                   onClick={() =>
//                     setRetry((value) => value + 1)
//                   }
//                 >
//                   Retry
//                 </Button>
//               )}

//               <Button
//                 variant="secondary"
//                 onClick={() => {
//                   window.history.back();
//                 }}
//               >
//                 Go Back
//               </Button>
//             </div>
//           </div>
//         </Card>
//       </div>
//     );
//   }

//   if (!supplier) {
//     return (
//       <Card>
//         <div className="p-6">
//           Supplier not found.
//           <Link
//             to="/suppliers"
//             className="ml-2 text-emerald-700 underline"
//           >
//             Back to Suppliers
//           </Link>
//         </div>
//       </Card>
//     );
//   }

//   const currency = supplier.currency || "BDT";

//   return (
//     <div className="space-y-6">

//       {/* Header */}
//       <div className="flex flex-wrap items-center justify-between gap-4">
//         <div>
//           <Link
//             to="/suppliers"
//             className="text-sm text-emerald-700 hover:underline"
//           >
//             ← Back to Suppliers
//           </Link>

//           <h1 className="mt-2 text-2xl font-bold text-gray-900">
//             {supplier.supplierName}
//           </h1>

//           <p className="text-sm text-gray-500">
//             Supplier Code: {displayValue(supplier.supplierCode)}
//             {" | "}
//             ID: {displayValue(supplier.publicId)}
//           </p>
//         </div>

//         <Badge>
//           {displayValue(supplier.status)}
//         </Badge>
//       </div>

//       {/* Overview */}
//       <Card>
//         <div className="p-6">
//           <h2 className="mb-5 text-lg font-semibold">
//             Supplier Overview
//           </h2>

//           <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
//             <InfoItem
//               label="Supplier Name"
//               value={supplier.supplierName}
//             />

//             <InfoItem
//               label="Company Name"
//               value={supplier.companyName}
//             />

//             <InfoItem
//               label="Supplier Type"
//               value={supplier.supplierType}
//             />

//             <InfoItem
//               label="Contact Person"
//               value={supplier.contactPerson?.name}
//             />

//             <InfoItem
//               label="Email"
//               value={supplier.email}
//             />

//             <InfoItem
//               label="Phone"
//               value={supplier.phone}
//             />

//             <InfoItem
//               label="Alternate Phone"
//               value={supplier.alternatePhone}
//             />

//             <InfoItem
//               label="Website"
//               value={supplier.website}
//             />

//             <InfoItem
//               label="Payment Terms"
//               value={supplier.paymentTerms}
//             />
//           </div>
//         </div>
//       </Card>

//       {/* Address */}
//       <Card>
//         <div className="p-6">
//           <h2 className="mb-4 text-lg font-semibold">
//             Address Information
//           </h2>

//           <pre className="whitespace-pre-wrap text-sm text-gray-700">
//             {supplier.address
//               ? JSON.stringify(supplier.address, null, 2)
//               : "Address not provided"}
//           </pre>
//         </div>
//       </Card>

//       {/* Financial Information */}
//       <Card>
//         <div className="p-6">
//           <h2 className="mb-5 text-lg font-semibold">
//             Financial Information
//           </h2>

//           <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
//             <InfoItem
//               label="Credit Limit"
//               value={formatMoney(supplier.creditLimit, currency)}
//             />

//             <InfoItem
//               label="Current Payable"
//               value={formatMoney(supplier.currentPayable, currency)}
//             />

//             <InfoItem
//               label="Available Credit"
//               value={formatMoney(supplier.availableCredit, currency)}
//             />
//           </div>
//         </div>
//       </Card>

//       {/* Notes */}
//       <Card>
//         <div className="p-6">
//           <h2 className="mb-3 text-lg font-semibold">
//             Notes
//           </h2>

//           <p className="whitespace-pre-wrap text-gray-700">
//             {displayValue(supplier.notes)}
//           </p>
//         </div>
//       </Card>

//     </div>
//   );
// }






import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { SupplierService } from "../../services/supplierService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const display = (value, fallback = "—") => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
};

const money = (value, currency = "BDT") => {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  const amount = Number(value);

  return Number.isFinite(amount)
    ? `${amount.toLocaleString("en-BD", {
        maximumFractionDigits: 2,
      })} ${currency}`
    : "—";
};

const formatDate = (value) => {
  if (!value) return "—";

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString("en-BD");
};

const statusVariant = (status) => ({
  active: "success",
  inactive: "warning",
  blacklisted: "danger",
}[String(status || "").toLowerCase()] || "neutral");

const supplierTypeLabel = (value) => ({
  manufacturer: "Manufacturer",
  distributor: "Distributor",
  wholesaler: "Wholesaler",
  importer: "Importer",
  local_vendor: "Local Vendor",
  service_provider: "Service Provider",
}[value] || display(value));

const paymentTermsLabel = (value) => display(value);

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-medium text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 wrap-break-words text-sm text-slate-900">
        {children ?? "—"}
      </dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <Card className="space-y-4 bg-white p-5 sm:p-6">
      <h2 className="border-b border-slate-100 pb-3 text-lg font-semibold text-slate-900">
        {title}
      </h2>
      {children}
    </Card>
  );
}

// Address schema is imported from a shared backend schema.
// Render the returned address properties without assuming
// unverified field names such as city, postalCode, or country.
function AddressInformation({ address }) {
  if (!address || typeof address !== "object") {
    return (
      <p className="text-sm text-slate-500">
        No address information provided.
      </p>
    );
  }

  const entries = Object.entries(address).filter(
    ([key, value]) =>
      key !== "_id" &&
      value !== undefined &&
      value !== null &&
      value !== ""
  );

  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No address information provided.
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <Field
          key={key}
          label={key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (letter) => letter.toUpperCase())}
        >
          {typeof value === "object"
            ? JSON.stringify(value)
            : display(value)}
        </Field>
      ))}
    </dl>
  );
}

function BankAccounts({ accounts }) {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No bank accounts provided.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map((account, index) => (
        <div
          key={`${account.accountNumber || "account"}-${index}`}
          className="rounded-lg border border-slate-200 p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-800">
              {display(account.bankName, `Bank Account ${index + 1}`)}
            </h3>

            {account.isDefault && (
              <Badge variant="success">Default Account</Badge>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Bank Name">{account.bankName}</Field>
            <Field label="Account Name">{account.accountName}</Field>
            <Field label="Account Number">{account.accountNumber}</Field>
            <Field label="Routing Number">{account.routingNumber}</Field>
            <Field label="Branch Name">{account.branchName}</Field>
          </dl>
        </div>
      ))}
    </div>
  );
}

function getErrorMessage(error) {
  const status = error?.response?.status;

  if (status === 404) {
    return "Supplier not found. The supplier may have been deleted or the ID may be incorrect.";
  }

  if (status === 403) {
    return "You do not have permission to view this supplier.";
  }

  if (status === 401) {
    return "Your session may have expired. Please sign in again.";
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.message === "Network Error") {
    return "Cannot connect to the server. Check that the backend is running.";
  }

  return error?.message || "Unable to load supplier details.";
}

export default function SupplierDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const loadSupplier = useCallback(async (isMounted) => {
    try {
      if (!id) {
        throw new Error("A supplier public ID was not provided.");
      }

      const response = await SupplierService.getSupplierById(id);

      if (!isMounted()) return;

      // Confirmed supplier API envelope:
      // { success, message, data: supplier }
      const data = response?.data;

      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
      ) {
        setSupplier(null);
        setError("The server did not return a valid supplier record.");
        return;
      }

      setSupplier(data);
      setError("");
    } catch (err) {
      if (!isMounted()) return;

      setSupplier(null);
      setError(getErrorMessage(err));
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    let active = true;

    void loadSupplier(() => active);

    return () => {
      active = false;
    };
  }, [loadSupplier, retry]);

  const handleRetry = () => {
    setIsLoading(true);
    setError("");
    setRetry((current) => current + 1);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-64 items-center justify-center p-6">
        <LoadingSpinner />
      </main>
    );
  }

  if (error || !supplier) {
    const isNotFound =
      error.toLowerCase().includes("supplier not found");

    return (
      <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 lg:p-8">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/suppliers")}
        >
          Back to Suppliers
        </Button>

        <Card className="p-6 text-center sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">
            {isNotFound
              ? "Supplier Not Found"
              : "Unable to Load Supplier"}
          </h1>

          <p className="mt-2 text-sm text-red-600" role="alert">
            {error || "No supplier data was returned."}
          </p>

          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            {!isNotFound && (
              <Button type="button" onClick={handleRetry}>
                Retry
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/suppliers")}
            >
              Return to Suppliers
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  const currency = supplier.currency || "BDT";
  const contact = supplier.contactPerson || {};

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/suppliers"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            ← Back to Suppliers
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="wrap-break-words text-2xl font-bold text-slate-900 sm:text-3xl">
              {display(supplier.supplierName, "Supplier Details")}
            </h1>

            <Badge variant={statusVariant(supplier.status)}>
              {display(supplier.status, "Unknown")}
            </Badge>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Supplier Code: {display(supplier.supplierCode)}
          </p>

          <p className="mt-1 break-all font-mono text-sm font-semibold text-emerald-700">
            Public ID: {display(supplier.publicId)}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/suppliers")}
        >
          Back to Suppliers
        </Button>
      </header>

      {/* Supplier information */}
      <Section title="Supplier Information">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Supplier Name">{supplier.supplierName}</Field>
          <Field label="Company Name">{supplier.companyName}</Field>
          <Field label="Supplier Code">{supplier.supplierCode}</Field>
          <Field label="Public ID">{supplier.publicId}</Field>
          <Field label="Supplier Type">
            {supplierTypeLabel(supplier.supplierType)}
          </Field>
          <Field label="Status">{supplier.status}</Field>
          <Field label="Trade License Number">
            {supplier.tradeLicenseNumber}
          </Field>
          <Field label="Tax Identification Number">
            {supplier.taxIdentificationNumber}
          </Field>
          <Field label="Website">
            {supplier.website ? (
              <a
                href={supplier.website}
                target="_blank"
                rel="noreferrer"
                className="break-all text-emerald-700 underline"
              >
                {supplier.website}
              </a>
            ) : "—"}
          </Field>
        </dl>
      </Section>

      {/* Contact information */}
      <Section title="Contact Information">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Contact Person">{contact.name}</Field>
          <Field label="Designation">{contact.designation}</Field>
          <Field label="Contact Person Phone">{contact.phone}</Field>
          <Field label="Contact Person Email">{contact.email}</Field>
          <Field label="Supplier Phone">{supplier.phone}</Field>
          <Field label="Alternate Phone">{supplier.alternatePhone}</Field>
          <Field label="Supplier Email">{supplier.email}</Field>
        </dl>
      </Section>

      {/* Address */}
      <Section title="Address Information">
        <AddressInformation address={supplier.address} />
      </Section>

      {/* Payment and financial information */}
      <Section title="Payment and Financial Information">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Payment Terms">
            {paymentTermsLabel(supplier.paymentTerms)}
          </Field>

          <Field label="Currency">{currency}</Field>

          <Field label="Credit Limit">
            {money(supplier.creditLimit, currency)}
          </Field>

          <Field label="Current Payable">
            {money(supplier.currentPayable, currency)}
          </Field>

          <Field label="Available Credit">
            {money(supplier.availableCredit, currency)}
          </Field>
        </dl>
      </Section>

      {/* Bank accounts */}
      <Section title="Bank Account Information">
        <BankAccounts accounts={supplier.bankAccounts} />
      </Section>

      {/* Notes */}
      <Section title="Additional Notes">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {display(supplier.notes, "No additional notes provided.")}
        </p>
      </Section>

      {/* Audit information */}
      <Section title="Record Information">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Created At">
            {formatDate(supplier.createdAt)}
          </Field>

          <Field label="Last Updated">
            {formatDate(supplier.updatedAt)}
          </Field>
        </dl>
      </Section>

    </main>
  );
}
