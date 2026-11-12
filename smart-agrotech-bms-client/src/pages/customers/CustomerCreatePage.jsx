
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { CustomerService } from "../../services/customerService";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card"; 

const CUSTOMER_TYPES = [
  ["individual", "Individual"],
  ["business", "Business"],
  ["wholesale", "Wholesale"],
  ["retail", "Retail"],
  ["Government", "Government"],
];

const MEMBERSHIP_LEVELS = ["Bronze", "Silver", "Gold", "Platinum"];

const PAYMENT_TERMS = [
  "Cash",
  "7 Days",
  "15 Days",
  "30 Days",
  "45 Days",
  "60 Days",
  "90 Days",
];

const INITIAL_ADDRESS = {
  label: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Bangladesh",
};

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  companyType: "",
  customerType: "individual",
  taxNumber: "",
  tradeLicense: "",
  billingAddress: { ...INITIAL_ADDRESS },
  shippingAddresses: [],
  creditLimit: "0",
  openingBalance: "0",
  paymentTerms: "Cash",
  currency: "BDT",
  membershipLevel: "Bronze",
  status: "active",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

function FieldError({ message }) {
  if (!message) return null;

  return (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {message}
    </p>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div className="border-b border-slate-100 pb-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}

function SelectField({
  id,
  label,
  name,
  value,
  onChange,
  options,
  error,
  required = false,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={inputClass}
        aria-invalid={Boolean(error)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>

      <FieldError message={error} />
    </div>
  );
}

function AddressFields({
  prefix,
  address,
  onChange,
  errors = {},
  showDefault = false,
  isDefault = false,
  onDefaultChange,
}) {
  const fields = [
    ["label", "Address label", false, "e.g. Head office"],
    ["addressLine1", "Address line 1", true, "Street, house, road"],
    ["addressLine2", "Address line 2", false, "Apartment, floor, etc."],
    ["city", "City", true, "Enter city"],
    ["state", "State / Division", false, "Enter state or division"],
    ["postalCode", "Postal code", false, "Enter postal code"],
    ["country", "Country", true, "Enter country"],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(([field, label, required, placeholder]) => {
          const id = `${prefix}-${field}`;

          return (
            <div
              key={field}
              className={
                field === "addressLine1" || field === "addressLine2"
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <Input
                id={id}
                label={label}
                name={id}
                value={address[field] || ""}
                onChange={(event) => onChange(field, event.target.value)}
                placeholder={placeholder}
                required={required}
              />
              <FieldError message={errors[field]} />
            </div>
          );
        })}
      </div>

      {showDefault && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => onDefaultChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
          />
          Set as default shipping address
        </label>
      )}
    </div>
  );
}

function getApiErrorMessage(error) {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors)) {
    return responseData.errors
      .map((item) => item?.message || item?.msg || String(item))
      .join(" ");
  }

  if (responseData?.message) {
    return responseData.message;
  }

  if (error?.message === "Network Error") {
    return "Could not connect to the server. Please check that the backend is running.";
  }

  return error?.message || "Customer creation failed. Please try again.";
}

function getApiFieldErrors(error) {
  const errors = error?.response?.data?.errors;

  if (!Array.isArray(errors)) return {};

  const result = {};

  errors.forEach((item) => {
    const field = String(item?.field || "")
      .replace(/^body\./, "")
      .replace(/^body$/, "");

    if (field) {
      result[field] = item?.message || item?.msg || "Invalid value.";
    }
  });

  return result;
}

function validateForm(formData) {
  const errors = {};

  if (formData.name.trim().length < 2) {
    errors.name = "Customer name must contain at least 2 characters.";
  } else if (formData.name.trim().length > 100) {
    errors.name = "Customer name cannot exceed 100 characters.";
  }

  const phone = formData.phone.trim();

  if (phone.length < 8 || phone.length > 20) {
    errors.phone = "Phone number must contain 8–20 characters.";
  }

  if (formData.email.trim()) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
  }

  if (!CUSTOMER_TYPES.some(([value]) => value === formData.customerType)) {
    errors.customerType = "Select a valid customer type.";
  }

  if (!MEMBERSHIP_LEVELS.includes(formData.membershipLevel)) {
    errors.membershipLevel = "Select a valid membership level.";
  }

  if (!PAYMENT_TERMS.includes(formData.paymentTerms)) {
    errors.paymentTerms = "Select valid payment terms.";
  }

  if (!["active", "inactive"].includes(formData.status)) {
    errors.status = "Select a valid customer status.";
  }

  if (!/^[A-Za-z]{3}$/.test(formData.currency.trim())) {
    errors.currency = "Currency must contain exactly 3 letters.";
  }

  const creditLimit = Number(formData.creditLimit);
  if (
    formData.creditLimit === "" ||
    !Number.isFinite(creditLimit) ||
    creditLimit < 0
  ) {
    errors.creditLimit = "Credit limit must be a number greater than or equal to 0.";
  }

  const openingBalance = Number(formData.openingBalance);
  if (
    formData.openingBalance === "" ||
    !Number.isFinite(openingBalance)
  ) {
    errors.openingBalance = "Enter a valid opening balance.";
  }

  const billing = formData.billingAddress;

  if (billing.addressLine1.trim().length < 3) {
    errors["billingAddress.addressLine1"] =
      "Billing address line 1 must contain at least 3 characters.";
  }

  if (billing.city.trim().length < 2) {
    errors["billingAddress.city"] =
      "Billing city must contain at least 2 characters.";
  }

  if (billing.country.trim().length < 2) {
    errors["billingAddress.country"] =
      "Billing country must contain at least 2 characters.";
  }

  let defaultShippingCount = 0;

  formData.shippingAddresses.forEach((address, index) => {
    const prefix = `shippingAddresses.${index}`;

    const hasAnyValue = Object.entries(address).some(([key, value]) => {
      if (key === "isDefault") return false;
      return String(value || "").trim() !== "";
    });

    // Ignore a completely blank optional address row.
    if (!hasAnyValue) return;

    if (address.addressLine1.trim().length < 3) {
      errors[`${prefix}.addressLine1`] =
        "Address line 1 must contain at least 3 characters.";
    }

    if (address.city.trim().length < 2) {
      errors[`${prefix}.city`] =
        "City must contain at least 2 characters.";
    }

    if (address.country.trim().length < 2) {
      errors[`${prefix}.country`] =
        "Country must contain at least 2 characters.";
    }

    if (address.isDefault) defaultShippingCount += 1;
  });

  if (defaultShippingCount > 1) {
    errors.shippingAddresses =
      "Only one shipping address can be marked as default.";
  }

  return errors;
}

function buildAddress(address, includeDefault = false) {
  const result = {
    addressLine1: address.addressLine1.trim(),
    city: address.city.trim(),
    country: address.country.trim(),
  };

  for (const field of [
    "label",
    "addressLine2",
    "state",
    "postalCode",
  ]) {
    const value = address[field]?.trim();

    if (value) result[field] = value;
  }

  if (includeDefault) {
    result.isDefault = Boolean(address.isDefault);
  }

  return result;
}

export default function CustomerCreatePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });

    setApiError("");
  }

  function handleBillingAddressChange(field, value) {
    setFormData((current) => ({
      ...current,
      billingAddress: {
        ...current.billingAddress,
        [field]: value,
      },
    }));

    setErrors((current) => {
      const next = { ...current };
      delete next[`billingAddress.${field}`];
      return next;
    });
  }

  function handleShippingAddressChange(index, field, value) {
    setFormData((current) => ({
      ...current,
      shippingAddresses: current.shippingAddresses.map((address, i) =>
        i === index ? { ...address, [field]: value } : address
      ),
    }));

    setErrors((current) => {
      const next = { ...current };
      delete next[`shippingAddresses.${index}.${field}`];
      return next;
    });
  }

  function addShippingAddress() {
    setFormData((current) => ({
      ...current,
      shippingAddresses: [
        ...current.shippingAddresses,
        { ...INITIAL_ADDRESS, isDefault: false },
      ],
    }));
  }

  function removeShippingAddress(index) {
    setFormData((current) => ({
      ...current,
      shippingAddresses: current.shippingAddresses.filter(
        (_, i) => i !== index
      ),
    }));

    setErrors({});
  }

  function setDefaultShippingAddress(index, checked) {
    setFormData((current) => ({
      ...current,
      shippingAddresses: current.shippingAddresses.map((address, i) => ({
        ...address,
        isDefault: checked ? i === index : false,
      })),
    }));

    setErrors((current) => {
      const next = { ...current };
      delete next.shippingAddresses;
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    setApiError("");

    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setApiError("Please correct the highlighted fields before submitting.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      customerType: formData.customerType,
      billingAddress: buildAddress(formData.billingAddress),
      shippingAddresses: formData.shippingAddresses
        .filter((address) =>
          [
            address.label,
            address.addressLine1,
            address.addressLine2,
            address.city,
            address.state,
            address.postalCode,
            address.country,
          ].some((value) => String(value || "").trim() !== "")
        )
        .map((address) => buildAddress(address, true)),
      creditLimit: Number(formData.creditLimit),
      openingBalance: Number(formData.openingBalance),
      paymentTerms: formData.paymentTerms,
      currency: formData.currency.trim().toUpperCase(),
      membershipLevel: formData.membershipLevel,
      status: formData.status,
    };

    // Optional fields are omitted when blank.
    for (const field of [
      "email",
      "companyName",
      "companyType",
      "taxNumber",
      "tradeLicense",
    ]) {
      const value = formData[field].trim();
      if (value) payload[field] = value;
    }

    setIsSubmitting(true);

    try {
      const response = await CustomerService.createCustomer(payload);
      const createdCustomer = response?.data;

      if (!response?.success || !createdCustomer?.publicId) {
        throw new Error(
          response?.message ||
            "The customer may have been created, but the response did not contain a customer public ID."
        );
      }

      navigate(`/customers/${encodeURIComponent(createdCustomer.publicId)}`, {
        replace: true,
        state: {
          successMessage:
            response.message || "Customer created successfully.",
        },
      });
    } catch (error) {
      setErrors(getApiFieldErrors(error));
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/customers"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            ← Back to Customers
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Create Customer
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Enter the customer information and billing details.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => navigate("/customers")}
        >
          Cancel
        </Button>
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
        <Card className="space-y-5 p-5 sm:p-6">
          <SectionTitle
            title="Basic Information"
            description="Name and phone number are required."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Input
                id="customer-name"
                label="Customer name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter customer name"
                required
              />
              <FieldError message={errors.name} />
            </div>

            <div>
              <Input
                id="customer-phone"
                label="Phone number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 01XXXXXXXXX"
                required
              />
              <FieldError message={errors.phone} />
            </div>

            <div>
              <Input
                id="customer-email"
                label="Email address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
              />
              <FieldError message={errors.email} />
            </div>

            <SelectField
              id="customer-type"
              label="Customer type"
              name="customerType"
              value={formData.customerType}
              onChange={handleChange}
              options={CUSTOMER_TYPES}
              error={errors.customerType}
              required
            />

            <div>
              <Input
                id="customer-company"
                label="Company name"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Enter company name"
              />
              <FieldError message={errors.companyName} />
            </div>

            <div>
              <Input
                id="customer-company-type"
                label="Company type"
                name="companyType"
                value={formData.companyType}
                onChange={handleChange}
                placeholder="Enter company type"
              />
              <FieldError message={errors.companyType} />
            </div>

            <div>
              <Input
                id="customer-tax-number"
                label="Tax number"
                name="taxNumber"
                value={formData.taxNumber}
                onChange={handleChange}
                placeholder="Enter tax number"
              />
              <FieldError message={errors.taxNumber} />
            </div>

            <div>
              <Input
                id="customer-trade-license"
                label="Trade license"
                name="tradeLicense"
                value={formData.tradeLicense}
                onChange={handleChange}
                placeholder="Enter trade license number"
              />
              <FieldError message={errors.tradeLicense} />
            </div>
          </div>
        </Card>

        <Card className="space-y-5 p-5 sm:p-6">
          <SectionTitle
            title="Billing Address"
            description="The billing address is required."
          />

          <AddressFields
            prefix="billing"
            address={formData.billingAddress}
            onChange={handleBillingAddressChange}
            errors={{
              addressLine1: errors["billingAddress.addressLine1"],
              city: errors["billingAddress.city"],
              country: errors["billingAddress.country"],
            }}
          />
        </Card>

        <Card className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle
              title="Shipping Addresses"
              description="Optional. Add one or more delivery addresses."
            />

            <Button
              type="button"
              variant="secondary"
              onClick={addShippingAddress}
              disabled={isSubmitting}
            >
              + Add Address
            </Button>
          </div>

          {errors.shippingAddresses && (
            <p className="text-sm text-red-600" role="alert">
              {errors.shippingAddresses}
            </p>
          )}

          {formData.shippingAddresses.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              No shipping address added. You can add one if it differs from
              the billing address.
            </p>
          ) : (
            <div className="space-y-5">
              {formData.shippingAddresses.map((address, index) => (
                <div
                  key={index}
                  className="space-y-4 rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-800">
                      Shipping Address {index + 1}
                    </h3>

                    <button
                      type="button"
                      onClick={() => removeShippingAddress(index)}
                      disabled={isSubmitting}
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>

                  <AddressFields
                    prefix={`shipping-${index}`}
                    address={address}
                    onChange={(field, value) =>
                      handleShippingAddressChange(index, field, value)
                    }
                    errors={{
                      addressLine1:
                        errors[`shippingAddresses.${index}.addressLine1`],
                      city: errors[`shippingAddresses.${index}.city`],
                      country: errors[`shippingAddresses.${index}.country`],
                    }}
                    showDefault
                    isDefault={Boolean(address.isDefault)}
                    onDefaultChange={(checked) =>
                      setDefaultShippingAddress(index, checked)
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-5 p-5 sm:p-6">
          <SectionTitle
            title="Account & Payment Information"
            description="Defaults are preselected according to the backend."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Input
                id="customer-credit-limit"
                label="Credit limit"
                name="creditLimit"
                type="number"
                value={formData.creditLimit}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
              <FieldError message={errors.creditLimit} />
            </div>

            <div>
              <Input
                id="customer-opening-balance"
                label="Opening balance"
                name="openingBalance"
                type="number"
                value={formData.openingBalance}
                onChange={handleChange}
                step="0.01"
              />
              <FieldError message={errors.openingBalance} />
            </div>

            <SelectField
              id="customer-payment-terms"
              label="Payment terms"
              name="paymentTerms"
              value={formData.paymentTerms}
              onChange={handleChange}
              options={PAYMENT_TERMS.map((term) => [term, term])}
              error={errors.paymentTerms}
            />

            <div>
              <Input
                id="customer-currency"
                label="Currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                maxLength={3}
                placeholder="BDT"
              />
              <FieldError message={errors.currency} />
            </div>

            <SelectField
              id="customer-membership"
              label="Membership level"
              name="membershipLevel"
              value={formData.membershipLevel}
              onChange={handleChange}
              options={MEMBERSHIP_LEVELS.map((level) => [level, level])}
              error={errors.membershipLevel}
            />

            <SelectField
              id="customer-status"
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                ["active", "Active"],
                ["inactive", "Inactive"],
              ]}
              error={errors.status}
            />
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => navigate("/customers")}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Customer..." : "Create Customer"}
          </Button>
        </div>
      </form>
    </main>
  );
}
