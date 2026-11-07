import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SupplierService } from "../../services/supplierService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const TYPES = [
  ["manufacturer", "Manufacturer"], ["distributor", "Distributor"],
  ["wholesaler", "Wholesaler"], ["importer", "Importer"],
  ["local_vendor", "Local Vendor"], ["service_provider", "Service Provider"],
];
const TERMS = ["Cash", "7 Days", "15 Days", "30 Days", "45 Days", "60 Days", "90 Days"];
const EMPTY = {
  supplierName: "", companyName: "", supplierType: "",
  contactPerson: { name: "", designation: "", phone: "", email: "" },
  email: "", phone: "", alternatePhone: "", website: "",
  paymentTerms: "Cash", creditLimit: "0", currency: "BDT",
  bankAccounts: [],
  address: { addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", country: "Bangladesh", isDefault: true },
  notes: "", status: "active",
};

const str = (value) => value == null ? "" : String(value);

function getError(error) {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((item) => item?.message || item?.msg || String(item)).join(" ");
  }
  if (data?.message) return data.message;
  if (error?.response?.status === 404) return "Supplier not found.";
  if (error?.response?.status === 401) return "Your session has expired. Please sign in again.";
  if (error?.response?.status === 403) return "You are not authorized to edit this supplier.";
  if (error?.message === "Network Error") return "Could not connect to the server.";
  return error?.message || "Unable to update supplier. Please try again.";
}

function toForm(s) {
  return {
    ...EMPTY,
    supplierName: str(s.supplierName),
    companyName: str(s.companyName),
    supplierType: str(s.supplierType),
    contactPerson: {
      name: str(s.contactPerson?.name),
      designation: str(s.contactPerson?.designation),
      phone: str(s.contactPerson?.phone),
      email: str(s.contactPerson?.email),
    },
    email: str(s.email), phone: str(s.phone), alternatePhone: str(s.alternatePhone),
    website: str(s.website), paymentTerms: str(s.paymentTerms || "Cash"),
    creditLimit: str(s.creditLimit ?? 0), currency: str(s.currency || "BDT"),
    bankAccounts: Array.isArray(s.bankAccounts) ? s.bankAccounts.map((a) => ({
      bankName: str(a.bankName), accountName: str(a.accountName),
      accountNumber: str(a.accountNumber), routingNumber: str(a.routingNumber),
      branchName: str(a.branchName), isDefault: Boolean(a.isDefault),
    })) : [],
    address: {
      addressLine1: str(s.address?.addressLine1), addressLine2: str(s.address?.addressLine2),
      city: str(s.address?.city), state: str(s.address?.state),
      postalCode: str(s.address?.postalCode), country: str(s.address?.country || "Bangladesh"),
      isDefault: Boolean(s.address?.isDefault),
    },
    notes: str(s.notes), status: str(s.status || "active"),
  };
}

function Field({ label, name, value, onChange, error, type = "text", required = false, ...props }) {
  return <div className="min-w-0">
    <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}{required && <span className="ml-1 text-red-600">*</span>}
    </label>
    <input id={name} name={name} type={type} value={value} onChange={onChange} {...props}
      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${error ? "border-red-400 focus:ring-red-100" : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"}`} />
    {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
  </div>;
}

function SelectField({ label, name, value, onChange, options, error }) {
  return <div className="min-w-0">
    <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
    <select id={name} name={name} value={value} onChange={onChange}
      className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm ${error ? "border-red-400" : "border-slate-300"}`}>
      <option value="">Select an option</option>
      {options.map(([v, labelText]) => <option key={v} value={v}>{labelText}</option>)}
    </select>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>;
}

function Section({ title, children }) {
  return <Card className="space-y-5 bg-white p-5 sm:p-6">
    <h2 className="border-b border-slate-100 pb-3 text-lg font-semibold text-slate-900">{title}</h2>
    {children}
  </Card>;
}

export default function SupplierEditPage() {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [supplierName, setSupplierName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;

    if (!publicId) {
      return () => {
        active = false;
      };
    }

    SupplierService.getSupplierById(publicId)
      .then((response) => {
        if (!active) return;

        const supplier = response?.data;

        if (!supplier) {
          throw new Error("Supplier not found.");
        }

        setForm(toForm(supplier));
        setSupplierName(str(supplier.supplierName));
      })
      .catch((err) => {
        if (active) {
          setError(getError(err));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [publicId]);

  const change = (event) => {
    const { name, value } = event.target;
    setForm((old) => ({ ...old, [name]: value }));
    setFieldErrors((old) => ({ ...old, [name]: "" }));
  };
  const changeContact = (key, value) => {
    setForm((old) => ({ ...old, contactPerson: { ...old.contactPerson, [key]: value } }));
    const keyMap = { name: "contactPersonName", email: "contactPersonEmail" };
    if (keyMap[key]) setFieldErrors((old) => ({ ...old, [keyMap[key]]: "" }));
  };
  const changeAddress = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((old) => ({ ...old, address: { ...old.address, [name]: type === "checkbox" ? checked : value } }));
    setFieldErrors((old) => ({ ...old, [name]: "" }));
  };
  const changeBank = (index, key, value) => {
    setForm((old) => ({
      ...old, bankAccounts: old.bankAccounts.map((account, i) => {
        if (i === index) return { ...account, [key]: value };
        return key === "isDefault" && value ? { ...account, isDefault: false } : account;
      })
    }));
  };
  const addBank = () => setForm((old) => ({
    ...old, bankAccounts: [...old.bankAccounts, {
      bankName: "", accountName: "", accountNumber: "", routingNumber: "", branchName: "",
      isDefault: old.bankAccounts.length === 0,
    }]
  }));

  function validate() {
    const e = {};
    if (form.supplierName.trim().length < 2) e.supplierName = "Supplier name must be at least 2 characters.";
    if (!form.supplierType) e.supplierType = "Please select a supplier type.";
    if (!form.contactPerson.name.trim()) e.contactPersonName = "Contact person name is required.";
    if (form.phone.trim().length < 6) e.phone = "Phone number must be at least 6 characters.";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email.trim() && !emailPattern.test(form.email.trim())) e.email = "Enter a valid email.";
    if (form.contactPerson.email.trim() && !emailPattern.test(form.contactPerson.email.trim())) e.contactPersonEmail = "Enter a valid email.";
    if (form.website.trim() && !/^https?:\/\/.+\..+/.test(form.website.trim())) e.website = "Enter a valid website URL, including https://.";
    if (!form.paymentTerms) e.paymentTerms = "Please select payment terms.";
    if (form.creditLimit.trim() === "" || !Number.isFinite(Number(form.creditLimit)) || Number(form.creditLimit) < 0) e.creditLimit = "Credit limit must be zero or a positive number.";
    if (!form.address.addressLine1.trim()) e.addressLine1 = "Address Line 1 is required.";
    if (!form.address.city.trim()) e.city = "City is required.";
    if (!form.address.country.trim()) e.country = "Country is required.";
    if (form.bankAccounts.filter((a) => a.isDefault).length > 1) e.bankAccounts = "Only one default bank account is allowed.";
    form.bankAccounts.forEach((a, i) => {
      if (!a.bankName.trim()) e[`bankName-${i}`] = "Bank name is required.";
      if (!a.accountName.trim()) e[`accountName-${i}`] = "Account name is required.";
      if (!a.accountNumber.trim()) e[`accountNumber-${i}`] = "Account number is required.";
    });
    return e;
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setError("");
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Please correct the highlighted fields before submitting.");
      return;
    }

    // Keep nested objects complete; do not send generated or accounting fields.
    const payload = {
      supplierName: form.supplierName.trim(),
      companyName: form.companyName.trim(),
      supplierType: form.supplierType,
      contactPerson: {
        name: form.contactPerson.name.trim(),
        designation: form.contactPerson.designation.trim(),
        phone: form.contactPerson.phone.trim(),
        email: form.contactPerson.email.trim(),
      },
      email: form.email.trim(), phone: form.phone.trim(),
      alternatePhone: form.alternatePhone.trim(), website: form.website.trim(),
      paymentTerms: form.paymentTerms, creditLimit: Number(form.creditLimit),
      currency: form.currency.trim() || "BDT",
      bankAccounts: form.bankAccounts.map((a) => ({
        bankName: a.bankName.trim(), accountName: a.accountName.trim(),
        accountNumber: a.accountNumber.trim(), routingNumber: a.routingNumber.trim(),
        branchName: a.branchName.trim(), isDefault: Boolean(a.isDefault),
      })),
      address: {
        addressLine1: form.address.addressLine1.trim(), addressLine2: form.address.addressLine2.trim(),
        city: form.address.city.trim(), state: form.address.state.trim(),
        postalCode: form.address.postalCode.trim(), country: form.address.country.trim(),
        isDefault: Boolean(form.address.isDefault),
      },
      notes: form.notes.trim(), status: form.status,
    };

    try {
      setSaving(true);
      await SupplierService.updateSupplier(publicId, payload);
      navigate(`/suppliers/${encodeURIComponent(publicId)}`, {
        replace: true, state: { message: "Supplier updated successfully." },
      });
    } catch (err) {
      setError(getError(err));
      const backendErrors = err?.response?.data?.errors;
      if (Array.isArray(backendErrors)) {
        const map = {
          "contactPerson.name": "contactPersonName",
          "contactPerson.email": "contactPersonEmail",
          "address.addressLine1": "addressLine1",
          "address.city": "city",
          "address.country": "country",
        };
        const mapped = {};
        backendErrors.forEach((item) => {
          const field = String(item?.field || "").replace(/^body\./, "");
          if (field) mapped[map[field] || field] = item?.message || "Invalid value.";
        });
        setFieldErrors((old) => ({ ...old, ...mapped }));
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-5xl py-10"><p role="status" className="text-sm text-slate-500">Loading supplier information...</p></main>;
  if (error && !supplierName) return <main className="mx-auto max-w-5xl space-y-4 py-8">
    <h1 className="text-2xl font-bold">Edit Supplier</h1>
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    <Button type="button" onClick={() => navigate("/suppliers")}>Back to Suppliers</Button>
  </main>;

  return <main className="mx-auto max-w-5xl space-y-6 pb-10">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-slate-900">Edit Supplier</h1><p className="mt-1 text-sm text-slate-500">Update {supplierName || publicId}.</p></div>
      <Link to={`/suppliers/${encodeURIComponent(publicId)}`} className="text-sm font-medium text-emerald-700 underline">Back to Supplier Details</Link>
    </header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <form onSubmit={submit} noValidate className="space-y-6">
      <Section title="Supplier Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Supplier Name" name="supplierName" value={form.supplierName} onChange={change} error={fieldErrors.supplierName} required />
          <SelectField label="Supplier Type" name="supplierType" value={form.supplierType} onChange={change} options={TYPES} error={fieldErrors.supplierType} />
          <Field label="Company Name" name="companyName" value={form.companyName} onChange={change} />
        </div>
      </Section>

      <Section title="Contact Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact Person Name" name="cp-name" value={form.contactPerson.name} onChange={(e) => changeContact("name", e.target.value)} error={fieldErrors.contactPersonName} required />
          <Field label="Designation" name="cp-designation" value={form.contactPerson.designation} onChange={(e) => changeContact("designation", e.target.value)} />
          <Field label="Contact Person Phone" name="cp-phone" value={form.contactPerson.phone} onChange={(e) => changeContact("phone", e.target.value)} />
          <Field label="Contact Person Email" name="cp-email" type="email" value={form.contactPerson.email} onChange={(e) => changeContact("email", e.target.value)} error={fieldErrors.contactPersonEmail} />
          <Field label="Supplier Phone" name="phone" value={form.phone} onChange={change} error={fieldErrors.phone} required />
          <Field label="Alternate Phone" name="alternatePhone" value={form.alternatePhone} onChange={change} />
          <Field label="Supplier Email" name="email" type="email" value={form.email} onChange={change} error={fieldErrors.email} />
          <Field label="Website" name="website" type="url" value={form.website} onChange={change} error={fieldErrors.website} placeholder="https://example.com" />
        </div>
      </Section>

      <Section title="Address Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Address Line 1" name="addressLine1" value={form.address.addressLine1} onChange={changeAddress} error={fieldErrors.addressLine1} required /></div>
          <div className="sm:col-span-2"><Field label="Address Line 2" name="addressLine2" value={form.address.addressLine2} onChange={changeAddress} /></div>
          <Field label="City" name="city" value={form.address.city} onChange={changeAddress} error={fieldErrors.city} required />
          <Field label="State / Division" name="state" value={form.address.state} onChange={changeAddress} />
          <Field label="Postal Code" name="postalCode" value={form.address.postalCode} onChange={changeAddress} />
          <Field label="Country" name="country" value={form.address.country} onChange={changeAddress} error={fieldErrors.country} required />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="isDefault" checked={form.address.isDefault} onChange={changeAddress} />Set as default address</label>
      </Section>

      <Section title="Financial Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Payment Terms" name="paymentTerms" value={form.paymentTerms} onChange={change} options={TERMS.map((v) => [v, v])} error={fieldErrors.paymentTerms} />
          <Field label="Credit Limit" name="creditLimit" type="number" min="0" step="0.01" value={form.creditLimit} onChange={change} error={fieldErrors.creditLimit} required />
          <Field label="Currency" name="currency" value={form.currency} onChange={change} />
          <SelectField label="Status" name="status" value={form.status} onChange={change} options={[["active", "Active"], ["inactive", "Inactive"], ["blacklisted", "Blacklisted"]]} />
        </div>
      </Section>

      <Section title="Bank Accounts">
        <div className="flex justify-end"><Button type="button" variant="secondary" onClick={addBank}>Add Bank Account</Button></div>
        {fieldErrors.bankAccounts && <p role="alert" className="text-sm text-red-600">{fieldErrors.bankAccounts}</p>}
        {form.bankAccounts.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No bank account added.</p> :
          form.bankAccounts.map((account, index) => <div key={index} className="space-y-4 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between"><h3 className="font-medium">Bank Account {index + 1}</h3><button type="button" className="text-sm text-red-600" onClick={() => setForm((old) => ({ ...old, bankAccounts: old.bankAccounts.filter((_, i) => i !== index) }))}>Remove</button></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {["bankName", "accountName", "accountNumber", "routingNumber", "branchName"].map((key) => <Field key={key} label={key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())} name={`${key}-${index}`} value={account[key]} onChange={(e) => changeBank(index, key, e.target.value)} error={fieldErrors[`${key}-${index}`]} required={["bankName", "accountName", "accountNumber"].includes(key)} />)}
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={account.isDefault} onChange={(e) => changeBank(index, "isDefault", e.target.checked)} />Default bank account</label>
          </div>)}
      </Section>

      <Section title="Additional Notes">
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
        <textarea id="notes" name="notes" rows={4} value={form.notes} onChange={change} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
      </Section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" disabled={saving} onClick={() => navigate(`/suppliers/${encodeURIComponent(publicId)}`)}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving Changes..." : "Save Changes"}</Button>
      </div>
    </form>
  </main>;
}
