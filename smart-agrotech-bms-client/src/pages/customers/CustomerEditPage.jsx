
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { CustomerService } from "../../services/customerService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const CUSTOMER_TYPES = [
  ["individual", "Individual"],
  ["business", "Business"],
  ["wholesale", "Wholesale"],
  ["retail", "Retail"],
  ["Government", "Government"],
];

const MEMBERSHIP_LEVELS = ["Bronze", "Silver", "Gold", "Platinum"];

const INITIAL_ADDRESS = {
  label: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

function FieldError({ message }) {
  if (!message) return null;

  return (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {message}
    </p>
  );
}

function SelectField({ id, label, value, onChange, options, error }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={onChange}
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

function AddressFields({ prefix, address, onChange, errors = {} }) {
  const fields = [
    ["label", "Address label", "e.g. Head office"],
    ["addressLine1", "Address line 1", "Street, house, road"],
    ["addressLine2", "Address line 2", "Apartment, floor, etc."],
    ["city", "City", "Enter city"],
    ["state", "State / Division", "Enter state or division"],
    ["postalCode", "Postal code", "Enter postal code"],
    ["country", "Country", "Enter country"],
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map(([field, label, placeholder]) => {
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
              value={address?.[field] || ""}
              onChange={(event) => onChange(field, event.target.value)}
              placeholder={placeholder}
            />
            <FieldError message={errors[field]} />
          </div>
        );
      })}
    </div>
  );
}

function getApiErrorMessage(error) {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item) => item?.message || item?.msg || String(item))
      .join(" ");
  }

  if (data?.message) return data.message;

  if (error?.message === "Network Error") {
    return "Could not connect to the server. Check your connection and try again.";
  }

  if (error?.response?.status === 404) {
    return "Customer not found. It may have been deleted or the customer ID is incorrect.";
  }

  if (error?.response?.status === 403) {
    return "You do not have permission to update this customer.";
  }

  return error?.message || "Customer update failed. Please try again.";
}

function getApiFieldErrors(error) {
  const apiErrors = error?.response?.data?.errors;

  if (!Array.isArray(apiErrors)) return {};

  const result = {};

  apiErrors.forEach((item) => {
    const field = String(item?.field || "")
      .replace(/^body\./, "")
      .replace(/^body$/, "");

    if (field) {
      result[field] = item?.message || item?.msg || "Invalid value.";
    }
  });

  return result;
}

function validateForm(form) {
  const errors = {};

  if (form.name.trim().length < 2 || form.name.trim().length > 100) {
    errors.name = "Name must contain between 2 and 100 characters.";
  }

  if (form.phone.trim().length < 8 || form.phone.trim().length > 20) {
    errors.phone = "Phone number must contain 8–20 characters.";
  }

  if (form.email.trim()) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(form.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
  }

  if (!CUSTOMER_TYPES.some(([value]) => value === form.customerType)) {
    errors.customerType = "Select a valid customer type.";
  }

  if (!MEMBERSHIP_LEVELS.includes(form.membershipLevel)) {
    errors.membershipLevel = "Select a valid membership level.";
  }

  if (!["active", "inactive"].includes(form.status)) {
    errors.status = "Select a valid status.";
  }

  if (
    form.creditLimit === "" ||
    !Number.isFinite(Number(form.creditLimit)) ||
    Number(form.creditLimit) < 0
  ) {
    errors.creditLimit =
      "Credit limit must be a number greater than or equal to zero.";
  }

  const billing = form.billingAddress;

  if (billing.addressLine1.trim().length < 3) {
    errors["billingAddress.addressLine1"] =
      "Address line 1 must contain at least 3 characters.";
  }

  if (billing.city.trim().length < 2) {
    errors["billingAddress.city"] =
      "City must contain at least 2 characters.";
  }

  if (billing.country.trim().length < 2) {
    errors["billingAddress.country"] =
      "Country must contain at least 2 characters.";
  }

  let defaultCount = 0;

  form.shippingAddresses.forEach((address, index) => {
    const hasAnyValue = [
      address.label,
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].some((value) => String(value || "").trim() !== "");

    // Empty optional address rows are ignored.
    if (!hasAnyValue) return;

    if (address.addressLine1.trim().length < 3) {
      errors[`shippingAddresses.${index}.addressLine1`] =
        "Address line 1 must contain at least 3 characters.";
    }

    if (address.city.trim().length < 2) {
      errors[`shippingAddresses.${index}.city`] =
        "City must contain at least 2 characters.";
    }

    if (address.country.trim().length < 2) {
      errors[`shippingAddresses.${index}.country`] =
        "Country must contain at least 2 characters.";
    }

    if (address.isDefault) defaultCount += 1;
  });

  if (defaultCount > 1) {
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

  if (includeDefault && typeof address.isDefault === "boolean") {
    result.isDefault = address.isDefault;
  }

  return result;
}

function customerToForm(customer) {
  const billingAddress = {
    ...INITIAL_ADDRESS,
    ...(customer.billingAddress || {}),
  };

  const shippingAddresses = Array.isArray(customer.shippingAddresses)
    ? customer.shippingAddresses.map((address) => ({
        ...INITIAL_ADDRESS,
        ...address,
      }))
    : [];

  return {
    name: customer.name || "",
    email: customer.email || "",
    phone: customer.phone || "",
    companyName: customer.companyName || "",
    customerType: customer.customerType || "individual",
    creditLimit: String(customer.creditLimit ?? 0),
    membershipLevel: customer.membershipLevel || "Bronze",
    status: customer.status || "active",
    billingAddress,
    shippingAddresses,
  };
}

export default function CustomerEditPage() {
  const { publicId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [apiError, setApiError] = useState("");
  const [errors, setErrors] = useState({});
  const [retryKey, setRetryKey] = useState(0);

  const loadCustomer = useCallback(async () => {
    if (!publicId) {
      setForm(null);
      setLoadError("Customer public ID was not provided.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError("");

    try {
      const response = await CustomerService.getCustomerById(publicId);
      const customer = response?.data;

      if (!response?.success || !customer?.publicId) {
        throw new Error(
          response?.message || "Customer details could not be found."
        );
      }

      setForm(customerToForm(customer));
    } catch (error) {
      setForm(null);
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      if (active) void loadCustomer();
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadCustomer, retryKey]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
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

  function handleBillingChange(field, value) {
    setForm((current) => ({
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

  function handleShippingChange(index, field, value) {
    setForm((current) => ({
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
    setForm((current) => ({
      ...current,
      shippingAddresses: [
        ...current.shippingAddresses,
        { ...INITIAL_ADDRESS, isDefault: false },
      ],
    }));
  }

  function removeShippingAddress(index) {
    setForm((current) => ({
      ...current,
      shippingAddresses: current.shippingAddresses.filter(
        (_, i) => i !== index
      ),
    }));

    setErrors({});
  }

  function setDefaultShippingAddress(index, checked) {
    setForm((current) => ({
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

    if (isSubmitting || !form) return;

    setApiError("");

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setApiError("Please correct the highlighted fields.");
      return;
    }

    // Only fields allowed by CUSTOMER_ALLOWED_UPDATE_FIELDS are sent.
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      customerType: form.customerType,
      billingAddress: buildAddress(form.billingAddress),
      shippingAddresses: form.shippingAddresses
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
      creditLimit: Number(form.creditLimit),
      membershipLevel: form.membershipLevel,
      status: form.status,
    };

    if (form.email.trim()) {
      payload.email = form.email.trim();
    }

    if (form.companyName.trim()) {
      payload.companyName = form.companyName.trim();
    }

    setIsSubmitting(true);

    try {
      const response = await CustomerService.updateCustomer(
        publicId,
        payload
      );

      if (!response?.success) {
        throw new Error(response?.message || "Customer update failed.");
      }

      navigate(`/customers/${encodeURIComponent(publicId)}`, {
        replace: true,
        state: {
          successMessage:
            response.message || "Customer updated successfully.",
        },
      });
    } catch (error) {
      setErrors(getApiFieldErrors(error));
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading customer information..." />
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <main className="mx-auto max-w-4xl space-y-4">
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {loadError || "Customer details are unavailable."}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
          >
            Try Again
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/customers")}
          >
            Back to Customers
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to={`/customers/${encodeURIComponent(publicId)}`}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            ← Back to Customer Details
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Edit Customer
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Customer ID: {publicId}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() =>
            navigate(`/customers/${encodeURIComponent(publicId)}`)
          }
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
          <h2 className="border-b border-slate-100 pb-3 text-lg font-semibold text-slate-900">
            Basic Information
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Input
                id="edit-customer-name"
                label="Customer name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
              <FieldError message={errors.name} />
            </div>

            <div>
              <Input
                id="edit-customer-phone"
                label="Phone number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
              />
              <FieldError message={errors.phone} />
            </div>

            <div>
              <Input
                id="edit-customer-email"
                label="Email address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />
              <FieldError message={errors.email} />
            </div>

            <div>
              <Input
                id="edit-customer-company"
                label="Company name"
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
              />
              <FieldError message={errors.companyName} />
            </div>

            <SelectField
              id="edit-customer-type"
              label="Customer type"
              value={form.customerType}
              onChange={(event) =>
                handleChange({
                  target: {
                    name: "customerType",
                    value: event.target.value,
                  },
                })
              }
              options={CUSTOMER_TYPES}
              error={errors.customerType}
            />

            <div>
              <Input
                id="edit-customer-credit"
                label="Credit limit"
                name="creditLimit"
                type="number"
                min="0"
                step="0.01"
                value={form.creditLimit}
                onChange={handleChange}
              />
              <FieldError message={errors.creditLimit} />
            </div>

            <SelectField
              id="edit-customer-membership"
              label="Membership level"
              value={form.membershipLevel}
              onChange={(event) =>
                handleChange({
                  target: {
                    name: "membershipLevel",
                    value: event.target.value,
                  },
                })
              }
              options={MEMBERSHIP_LEVELS.map((level) => [level, level])}
              error={errors.membershipLevel}
            />

            <SelectField
              id="edit-customer-status"
              label="Status"
              value={form.status}
              onChange={(event) =>
                handleChange({
                  target: {
                    name: "status",
                    value: event.target.value,
                  },
                })
              }
              options={[
                ["active", "Active"],
                ["inactive", "Inactive"],
              ]}
              error={errors.status}
            />
          </div>
        </Card>

        <Card className="space-y-5 p-5 sm:p-6">
          <h2 className="border-b border-slate-100 pb-3 text-lg font-semibold text-slate-900">
            Billing Address
          </h2>

          <AddressFields
            prefix="edit-billing"
            address={form.billingAddress}
            onChange={handleBillingChange}
            errors={{
              addressLine1: errors["billingAddress.addressLine1"],
              city: errors["billingAddress.city"],
              country: errors["billingAddress.country"],
            }}
          />
        </Card>

        <Card className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Shipping Addresses
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Add, update or remove customer shipping addresses.
              </p>
            </div>

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

          {form.shippingAddresses.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              No shipping addresses have been added.
            </p>
          ) : (
            <div className="space-y-5">
              {form.shippingAddresses.map((address, index) => (
                <div
                  key={address._id || index}
                  className="space-y-4 rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-800">
                      Shipping Address {index + 1}
                    </h3>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => removeShippingAddress(index)}
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>

                  <AddressFields
                    prefix={`edit-shipping-${index}`}
                    address={address}
                    onChange={(field, value) =>
                      handleShippingChange(index, field, value)
                    }
                    errors={{
                      addressLine1:
                        errors[`shippingAddresses.${index}.addressLine1`],
                      city: errors[`shippingAddresses.${index}.city`],
                      country: errors[`shippingAddresses.${index}.country`],
                    }}
                  />

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(address.isDefault)}
                      onChange={(event) =>
                        setDefaultShippingAddress(index, event.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    Default shipping address
                  </label>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() =>
              navigate(`/customers/${encodeURIComponent(publicId)}`)
            }
          >
            Cancel
          </Button>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving Changes..." : "Update Customer"}
          </Button>
        </div>
      </form>
    </main>
  );
}
