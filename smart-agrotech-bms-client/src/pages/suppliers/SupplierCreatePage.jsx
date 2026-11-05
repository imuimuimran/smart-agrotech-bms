import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { SupplierService } from "../../services/supplierService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

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

const INITIAL_FORM_STATE = {
  supplierName: "",
  companyName: "",
  supplierType: "",
  contactPerson: {
    name: "",
    designation: "",
    phone: "",
    email: "",
  },
  email: "",
  phone: "",
  alternatePhone: "",
  website: "",
  tradeLicenseNumber: "",
  taxIdentificationNumber: "",
  paymentTerms: "Cash",
  creditLimit: "0",
  currency: "BDT",
  bankAccounts: [],
  address: {
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Bangladesh",
    isDefault: true,
  },
  notes: "",
};

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors
      .map((item) => item?.message || item?.msg || String(item))
      .join(" ");
  }

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (error?.message === "Network Error") {
    return "Could not connect to the server. Please check that the backend is running.";
  }

  return error?.message || "Unable to create supplier. Please try again.";
}

function validateForm(formData) {
  const errors = {};

  if (formData.supplierName.trim().length < 2) {
    errors.supplierName = "Supplier name must be at least 2 characters long.";
  }

  if (!formData.supplierType) {
    errors.supplierType = "Please select a supplier type.";
  }

  if (!formData.contactPerson.name.trim()) {
    errors.contactPersonName = "Contact person name is required.";
  }

  if (formData.phone.trim().length < 6) {
    errors.phone = "Phone number must be at least 6 characters long.";
  }

  if (
    formData.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
  ) {
    errors.email = "Please enter a valid email address.";
  }

  if (
    formData.contactPerson.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      formData.contactPerson.email.trim()
    )
  ) {
    errors.contactPersonEmail = "Please enter a valid contact person email.";
  }

  if (
    formData.website.trim() &&
    !/^https?:\/\/.+\..+/.test(formData.website.trim())
  ) {
    errors.website = "Enter a valid website URL, including https://.";
  }

  if (!formData.paymentTerms) {
    errors.paymentTerms = "Please select payment terms.";
  }

  const creditLimit = Number(formData.creditLimit);

  if (
    formData.creditLimit.trim() === "" ||
    !Number.isFinite(creditLimit) ||
    creditLimit < 0
  ) {
    errors.creditLimit = "Credit limit must be zero or a positive number.";
  }

  if (!formData.address.addressLine1.trim()) {
    errors.addressLine1 = "Address Line 1 is required.";
  }

  if (!formData.address.city.trim()) {
    errors.city = "City is required.";
  }

  if (!formData.address.country.trim()) {
    errors.country = "Country is required.";
  }

  const defaultAccounts = formData.bankAccounts.filter(
    (account) => account.isDefault
  );

  if (defaultAccounts.length > 1) {
    errors.bankAccounts = "Only one default bank account is allowed.";
  }

  formData.bankAccounts.forEach((account, index) => {
    if (!account.bankName.trim()) {
      errors[`bankName-${index}`] = "Bank name is required.";
    }

    if (!account.accountName.trim()) {
      errors[`accountName-${index}`] = "Account name is required.";
    }

    if (!account.accountNumber.trim()) {
      errors[`accountNumber-${index}`] = "Account number is required.";
    }
  });

  return errors;
}

function FormField({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  required = false,
  placeholder = "",
  ...props
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
        }`}
        {...props}
      />

      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required = false,
  placeholder = "Select an option",
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div className="mb-5 border-b border-slate-100 pb-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}

export default function SupplierCreatePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  }

  function handleContactChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      contactPerson: {
        ...previous.contactPerson,
        [name]: value,
      },
    }));

    const errorKey =
      name === "name"
        ? "contactPersonName"
        : name === "email"
          ? "contactPersonEmail"
          : "";

    if (errorKey) {
      setFieldErrors((previous) => ({
        ...previous,
        [errorKey]: "",
      }));
    }
  }

  function handleAddressChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      address: {
        ...previous.address,
        [name]: type === "checkbox" ? checked : value,
      },
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  }

  function addBankAccount() {
    setFormData((previous) => ({
      ...previous,
      bankAccounts: [
        ...previous.bankAccounts,
        {
          bankName: "",
          accountName: "",
          accountNumber: "",
          routingNumber: "",
          branchName: "",
          isDefault: previous.bankAccounts.length === 0,
        },
      ],
    }));
  }

  function updateBankAccount(index, name, value) {
    setFormData((previous) => ({
      ...previous,
      bankAccounts: previous.bankAccounts.map((account, accountIndex) => {
        if (accountIndex !== index) {
          return name === "isDefault" && value
            ? { ...account, isDefault: false }
            : account;
        }

        return { ...account, [name]: value };
      }),
    }));
  }

  function removeBankAccount(index) {
    setFormData((previous) => ({
      ...previous,
      bankAccounts: previous.bankAccounts.filter(
        (_, accountIndex) => accountIndex !== index
      ),
    }));

    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[`bankName-${index}`];
      delete next[`accountName-${index}`];
      delete next[`accountNumber-${index}`];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    setApiError("");

    const errors = validateForm(formData);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setApiError("Please correct the highlighted fields before submitting.");
      return;
    }

    const payload = {
      supplierName: formData.supplierName.trim(),
      supplierType: formData.supplierType,
      contactPerson: {
        name: formData.contactPerson.name.trim(),
        designation: formData.contactPerson.designation.trim(),
        phone: formData.contactPerson.phone.trim(),
        email: formData.contactPerson.email.trim(),
      },
      phone: formData.phone.trim(),
      paymentTerms: formData.paymentTerms,
      creditLimit: Number(formData.creditLimit),
      address: {
        addressLine1: formData.address.addressLine1.trim(),
        addressLine2: formData.address.addressLine2.trim(),
        city: formData.address.city.trim(),
        state: formData.address.state.trim(),
        postalCode: formData.address.postalCode.trim(),
        country: formData.address.country.trim(),
        isDefault: formData.address.isDefault,
      },
      bankAccounts: formData.bankAccounts.map((account) => ({
        bankName: account.bankName.trim(),
        accountName: account.accountName.trim(),
        accountNumber: account.accountNumber.trim(),
        routingNumber: account.routingNumber.trim(),
        branchName: account.branchName.trim(),
        isDefault: Boolean(account.isDefault),
      })),
    };

    // Optional fields are included only when the user has entered a value.
    const optionalFields = [
      "companyName",
      "email",
      "alternatePhone",
      "website",
      "tradeLicenseNumber",
      "taxIdentificationNumber",
      "notes",
      "currency",
    ];

    optionalFields.forEach((field) => {
      const value = formData[field]?.trim();
      if (value) payload[field] = value;
    });

    try {
      setIsSubmitting(true);

      await SupplierService.createSupplier(payload);

      navigate("/suppliers", {
        replace: true,
        state: { message: "Supplier created successfully." },
      });
    } catch (error) {
      setApiError(getErrorMessage(error));

      const backendErrors = error?.response?.data?.errors;

      if (Array.isArray(backendErrors)) {
        const mappedErrors = {};

        backendErrors.forEach((item) => {
          const field = String(item?.field || "").replace(/^body\./, "");
          const message = item?.message || "Invalid value.";

          const fieldMap = {
            "contactPerson.name": "contactPersonName",
            "contactPerson.email": "contactPersonEmail",
            "address.addressLine1": "addressLine1",
            "address.city": "city",
            "address.country": "country",
          };

          const mappedField = fieldMap[field] || field;

          if (mappedField) mappedErrors[mappedField] = message;
        });

        setFieldErrors((previous) => ({
          ...previous,
          ...mappedErrors,
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Create Supplier
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Add a new supplier to your business management system.
          </p>
        </div>

        <Link
          to="/suppliers"
          className="text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
        >
          Back to Suppliers
        </Link>
      </header>

      {apiError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <Card className="space-y-5 bg-white p-5 sm:p-6">
          <SectionHeading
            title="Supplier Information"
            description="Basic identification and classification of the supplier."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Supplier Name"
              name="supplierName"
              value={formData.supplierName}
              onChange={handleChange}
              error={fieldErrors.supplierName}
              required
              placeholder="Enter supplier name"
            />

            <FormSelect
              label="Supplier Type"
              name="supplierType"
              value={formData.supplierType}
              onChange={handleChange}
              options={SUPPLIER_TYPES}
              error={fieldErrors.supplierType}
              required
            />

            <FormField
              label="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Enter company name"
            />
          </div>
        </Card>

        <Card className="space-y-5 bg-white p-5 sm:p-6">
          <SectionHeading
            title="Contact Information"
            description="Primary supplier and contact person details."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Contact Person Name"
              name="name"
              value={formData.contactPerson.name}
              onChange={handleContactChange}
              error={fieldErrors.contactPersonName}
              required
              placeholder="Enter contact person name"
            />

            <FormField
              label="Designation"
              name="designation"
              value={formData.contactPerson.designation}
              onChange={handleContactChange}
              placeholder="e.g. Sales Manager"
            />

            <FormField
              label="Contact Person Phone"
              name="phone"
              value={formData.contactPerson.phone}
              onChange={handleContactChange}
              placeholder="Contact person's phone"
            />

            <FormField
              label="Contact Person Email"
              name="email"
              type="email"
              value={formData.contactPerson.email}
              onChange={handleContactChange}
              error={fieldErrors.contactPersonEmail}
              placeholder="contact@example.com"
            />

            <FormField
              label="Supplier Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={fieldErrors.phone}
              required
              placeholder="Enter supplier phone number"
            />

            <FormField
              label="Alternate Phone"
              name="alternatePhone"
              value={formData.alternatePhone}
              onChange={handleChange}
              placeholder="Enter alternate phone"
            />

            <FormField
              label="Supplier Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={fieldErrors.email}
              placeholder="supplier@example.com"
            />

            <FormField
              label="Website"
              name="website"
              type="url"
              value={formData.website}
              onChange={handleChange}
              error={fieldErrors.website}
              placeholder="https://example.com"
            />
          </div>
        </Card>

        <Card className="space-y-5 bg-white p-5 sm:p-6">
          <SectionHeading
            title="Address Information"
            description="The supplier's primary business address."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField
                label="Address Line 1"
                name="addressLine1"
                value={formData.address.addressLine1}
                onChange={handleAddressChange}
                error={fieldErrors.addressLine1}
                required
                placeholder="House, road, area or street"
              />
            </div>

            <div className="sm:col-span-2">
              <FormField
                label="Address Line 2"
                name="addressLine2"
                value={formData.address.addressLine2}
                onChange={handleAddressChange}
                placeholder="Additional address information"
              />
            </div>

            <FormField
              label="City"
              name="city"
              value={formData.address.city}
              onChange={handleAddressChange}
              error={fieldErrors.city}
              required
              placeholder="Enter city"
            />

            <FormField
              label="State / Division"
              name="state"
              value={formData.address.state}
              onChange={handleAddressChange}
              placeholder="Enter state or division"
            />

            <FormField
              label="Postal Code"
              name="postalCode"
              value={formData.address.postalCode}
              onChange={handleAddressChange}
              placeholder="Enter postal code"
            />

            <FormField
              label="Country"
              name="country"
              value={formData.address.country}
              onChange={handleAddressChange}
              error={fieldErrors.country}
              required
              placeholder="Enter country"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isDefault"
              checked={formData.address.isDefault}
              onChange={handleAddressChange}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            Set as default address
          </label>
        </Card>

        <Card className="space-y-5 bg-white p-5 sm:p-6">
          <SectionHeading
            title="Business Information"
            description="Business registration details, if available."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Trade License Number"
              name="tradeLicenseNumber"
              value={formData.tradeLicenseNumber}
              onChange={handleChange}
              placeholder="Enter trade license number"
            />

            <FormField
              label="Tax Identification Number (TIN)"
              name="taxIdentificationNumber"
              value={formData.taxIdentificationNumber}
              onChange={handleChange}
              placeholder="Enter TIN"
            />
          </div>
        </Card>

        <Card className="space-y-5 bg-white p-5 sm:p-6">
          <SectionHeading
            title="Financial Information"
            description="Set the supplier's payment terms and credit limit."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label="Payment Terms"
              name="paymentTerms"
              value={formData.paymentTerms}
              onChange={handleChange}
              options={PAYMENT_TERMS.map((term) => [term, term])}
              error={fieldErrors.paymentTerms}
              required
            />

            <FormField
              label="Credit Limit"
              name="creditLimit"
              type="number"
              min="0"
              step="0.01"
              value={formData.creditLimit}
              onChange={handleChange}
              error={fieldErrors.creditLimit}
              required
              placeholder="0"
            />

            <FormField
              label="Currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              placeholder="BDT"
            />
          </div>
        </Card>

        <Card className="space-y-5 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Bank Accounts
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Optional. Add a bank account if the supplier has provided one.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={addBankAccount}
            >
              Add Bank Account
            </Button>
          </div>

          {fieldErrors.bankAccounts && (
            <p className="text-sm text-red-600" role="alert">
              {fieldErrors.bankAccounts}
            </p>
          )}

          {formData.bankAccounts.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              No bank account added.
            </p>
          ) : (
            <div className="space-y-5">
              {formData.bankAccounts.map((account, index) => (
                <div
                  key={index}
                  className="space-y-4 rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-800">
                      Bank Account {index + 1}
                    </h3>

                    <button
                      type="button"
                      onClick={() => removeBankAccount(index)}
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      ["bankName", "Bank Name"],
                      ["accountName", "Account Name"],
                      ["accountNumber", "Account Number"],
                      ["routingNumber", "Routing Number"],
                      ["branchName", "Branch Name"],
                    ].map(([field, label]) => (
                      <FormField
                        key={field}
                        label={label}
                        name={`${field}-${index}`}
                        value={account[field]}
                        onChange={(event) =>
                          updateBankAccount(index, field, event.target.value)
                        }
                        error={fieldErrors[`${field}-${index}`]}
                        required={[
                          "bankName",
                          "accountName",
                          "accountNumber",
                        ].includes(field)}
                      />
                    ))}
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={account.isDefault}
                      onChange={(event) =>
                        updateBankAccount(
                          index,
                          "isDefault",
                          event.target.checked
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    Default bank account
                  </label>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4 bg-white p-5 sm:p-6">
          <SectionHeading title="Additional Notes" />

          <div>
            <label
              htmlFor="notes"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Notes
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Enter additional supplier information..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => navigate("/suppliers")}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Supplier..." : "Create Supplier"}
          </Button>
        </div>
      </form>
    </main>
  );
}