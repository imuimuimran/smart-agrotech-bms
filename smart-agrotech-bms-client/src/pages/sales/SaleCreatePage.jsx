// src/pages/sales/SaleCreatePage.jsx

import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { SaleService } from "../../services/saleService";
import { CustomerService } from "../../services/customerService";
import { ProductService } from "../../services/productService";
import { WarehouseService } from "../../services/warehouseService";

import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const PAGE_SIZE = 100;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "ROCKET", label: "Rocket" },
  { value: "CHEQUE", label: "Cheque" },
];

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

function unwrapList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  return [];
}

function getResponseMeta(response) {
  return (
    response?.meta ??
    response?.pagination ??
    response?.data?.meta ??
    response?.data?.pagination ??
    {}
  );
}

async function fetchAllPages(fetchPage) {
  const allItems = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 25) {
    const response = await fetchPage({ page, limit: PAGE_SIZE });
    allItems.push(...unwrapList(response));

    const meta = getResponseMeta(response);
    const reportedPages = Number(meta.totalPages);

    if (!Number.isFinite(reportedPages) || reportedPages < 1) {
      break;
    }

    totalPages = reportedPages;
    page += 1;
  }

  return allItems;
}

function getMongoId(record) {
  const id = record?._id ?? record?.id;
  return typeof id === "string" && OBJECT_ID_REGEX.test(id) ? id : "";
}

function getProductPrice(product) {
  const value = Number(
    product?.pricing?.sellingPrice ??
    product?.sellingPrice ??
    product?.price
  );

  return Number.isFinite(value) && value >= 0 ? value : null;
}

function getErrorMessage(error, fallback = "Unable to create the sale.") {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((item) => item?.message || item?.msg || String(item))
      .join(" ");
  }

  if (data?.errors && typeof data.errors === "object") {
    return Object.entries(data.errors)
      .map(([field, value]) => {
        const message = Array.isArray(value) ? value.join(", ") : String(value);
        return `${field}: ${message}`;
      })
      .join(" ");
  }

  return data?.message || data?.error || error?.message || fallback;
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getToday() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function FormSection({ title, children }) {
  return (
    <Card className="space-y-4">
      <h2 className="border-b border-slate-100 pb-2 text-lg font-semibold text-slate-900">
        {title}
      </h2>
      {children}
    </Card>
  );
}

export default function SaleCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = getRole(user);
  const canCreateSale = ["admin", "moderator"].includes(role);

  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [lookupError, setLookupError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [saleDate, setSaleDate] = useState(getToday());
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleItems, setSaleItems] = useState([]);

  const [saleDiscount, setSaleDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [paymentComment, setPaymentComment] = useState("");
  const [remarks, setRemarks] = useState("");

  const [validationError, setValidationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadLookups() {
      try {
        const [customerList, warehouseList, productList] = await Promise.all([
          fetchAllPages((params) =>
            CustomerService.getCustomers({ ...params, status: "active" })
          ),
          fetchAllPages((params) => WarehouseService.getWarehouses(params)),
          fetchAllPages((params) =>
            ProductService.getProducts({ ...params, status: "active" })
          ),
        ]);

        if (!active) return;

        setCustomers(customerList.filter((item) => getMongoId(item)));
        setWarehouses(warehouseList.filter((item) => getMongoId(item)));
        setProducts(
          productList.filter((item) => {
            const status = String(item?.status || "").toLowerCase();
            return (
              getMongoId(item) &&
              getProductPrice(item) !== null &&
              !["archived", "discontinued", "inactive"].includes(status) &&
              item?.inventoryConfig?.trackInventory !== false
            );
          })
        );
      } catch (error) {
        if (active) {
          setLookupError(
            getErrorMessage(error, "Unable to load customers, products, or warehouses.")
          );
        }
      } finally {
        if (active) {
          setIsLoadingLookups(false);
        }
      }
    }

    loadLookups();

    return () => {
      active = false;
    };
  }, []);

  const subtotal = useMemo(
    () =>
      saleItems.reduce((sum, item) => {
        const product = products.find(
          (candidate) => getMongoId(candidate) === item.productId
        );
        const price = getProductPrice(product);
        return sum + (price ?? 0) * Number(item.quantity || 0);
      }, 0),
    [saleItems, products]
  );

  const lineDiscountTotal = useMemo(
    () =>
      saleItems.reduce(
        (sum, item) => sum + Number(item.discount || 0),
        0
      ),
    [saleItems]
  );

  const numericSaleDiscount = Number(saleDiscount || 0);
  const numericPaidAmount = Number(paidAmount || 0);
  const totalAmount = Math.max(
    0,
    subtotal - lineDiscountTotal - numericSaleDiscount
  );
  const dueAmount = Math.max(0, totalAmount - numericPaidAmount);

  function addProduct() {
    setValidationError("");
    setSubmitError("");

    const product = products.find(
      (item) => getMongoId(item) === selectedProductId
    );

    if (!product || !selectedProductId) {
      setValidationError("Please select a product.");
      return;
    }

    if (saleItems.some((item) => item.productId === selectedProductId)) {
      setValidationError(
        "This product is already in the sale. Update its quantity instead of adding it again."
      );
      return;
    }

    setSaleItems((current) => [
      ...current,
      {
        productId: selectedProductId,
        quantity: "1",
        discount: "0",
      },
    ]);
    setSelectedProductId("");
  }

  function updateSaleItem(productId, field, value) {
    setSaleItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, [field]: value }
          : item
      )
    );
  }

  function removeSaleItem(productId) {
    setSaleItems((current) =>
      current.filter((item) => item.productId !== productId)
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationError("");
    setSubmitError("");

    if (!OBJECT_ID_REGEX.test(customerId)) {
      setValidationError("Please select an active customer.");
      return;
    }

    if (!OBJECT_ID_REGEX.test(warehouseId)) {
      setValidationError("Please select an active warehouse.");
      return;
    }

    if (!saleDate) {
      setValidationError("Sale date is required.");
      return;
    }

    if (saleItems.length === 0) {
      setValidationError("Add at least one product to the sale.");
      return;
    }

    const productsPayload = [];

    for (const item of saleItems) {
      const product = products.find(
        (candidate) => getMongoId(candidate) === item.productId
      );
      const unitPrice = getProductPrice(product);
      const quantity = Number(item.quantity);
      const lineDiscount = Number(item.discount || 0);

      if (!product || unitPrice === null) {
        setValidationError("One of the selected products is no longer available.");
        return;
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        setValidationError(
          `Quantity for ${product.productName || "the selected product"} must be a whole number of at least 1.`
        );
        return;
      }

      if (!Number.isFinite(lineDiscount) || lineDiscount < 0) {
        setValidationError("Each line discount must be a valid non-negative amount.");
        return;
      }

      if (lineDiscount > unitPrice * quantity) {
        setValidationError(
          `The line discount cannot exceed the line subtotal for ${product.productName || "the selected product"}.`
        );
        return;
      }

      productsPayload.push({
        productId: item.productId,
        quantity,
        unitPrice,
        discount: lineDiscount,
      });
    }

    if (!Number.isFinite(numericSaleDiscount) || numericSaleDiscount < 0) {
      setValidationError("Sale discount must be a valid non-negative amount.");
      return;
    }

    if (numericSaleDiscount > subtotal - lineDiscountTotal) {
      setValidationError("Sale discount cannot exceed the remaining sale subtotal.");
      return;
    }

    if (!Number.isFinite(numericPaidAmount) || numericPaidAmount < 0) {
      setValidationError("Paid amount must be a valid non-negative amount.");
      return;
    }

    if (numericPaidAmount > totalAmount) {
      setValidationError("Paid amount cannot exceed the sale total.");
      return;
    }

    if (numericPaidAmount > 0 && !PAYMENT_METHODS.some(
      (method) => method.value === paymentMethod
    )) {
      setValidationError("Select a valid payment method when recording an initial payment.");
      return;
    }

    const payload = {
      customerId,
      warehouseId,
      products: productsPayload,
      discount: numericSaleDiscount,
      paidAmount: numericPaidAmount,
      ...(numericPaidAmount > 0 ? { paymentMethod } : {}),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
      ...(paymentComment.trim()
        ? { paymentComment: paymentComment.trim() }
        : {}),
      saleDate: new Date(`${saleDate}T00:00:00`).toISOString(),
      remarks: remarks.trim(),
    };

    setIsSubmitting(true);

    try {
      const response = await SaleService.createSale(payload);

      if (response?.success === false) {
        throw new Error(response?.message || "The sale could not be created.");
      }

      navigate("/sales", {
        replace: true,
        state: {
          successMessage: response?.message || "Sale created successfully.",
        },
      });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canCreateSale) {
    return <Navigate to="/forbidden" replace />;
  }

  if (isLoadingLookups) {
    return (
      <div className="p-6">
        <LoadingSpinner label="Loading customers, products, and warehouses..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Sale</h1>
          <p className="mt-1 text-sm text-slate-500">
            Record a sale and deduct the sold quantities from the selected warehouse.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/sales")}
        >
          Back to Sales
        </Button>
      </div>

      {lookupError && (
        <Card>
          <p className="text-sm text-red-700" role="alert">{lookupError}</p>
          <p className="mt-2 text-sm text-slate-600">
            The form cannot be submitted until the required lookup data loads successfully.
          </p>
        </Card>
      )}

      {validationError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {validationError}
        </p>
      )}

      {submitError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {submitError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Sale information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="sale-customer" className="mb-2 block text-sm font-medium text-slate-700">
                Customer <span className="text-red-600">*</span>
              </label>
              <select
                id="sale-customer"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select an active customer</option>
                {customers.map((customer) => (
                  <option key={getMongoId(customer)} value={getMongoId(customer)}>
                    {customer.name || customer.companyName || "Unnamed customer"}
                    {customer.phone ? ` — ${customer.phone}` : ""}
                  </option>
                ))}
              </select>
              {customers.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">No active customers were returned by the API.</p>
              )}
            </div>

            <div>
              <label htmlFor="sale-warehouse" className="mb-2 block text-sm font-medium text-slate-700">
                Warehouse <span className="text-red-600">*</span>
              </label>
              <select
                id="sale-warehouse"
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select an active warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={getMongoId(warehouse)} value={getMongoId(warehouse)}>
                    {warehouse.warehouseName || "Unnamed warehouse"}
                    {warehouse.warehouseCode ? ` (${warehouse.warehouseCode})` : ""}
                  </option>
                ))}
              </select>
              {warehouses.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">No active warehouses were returned by the API.</p>
              )}
            </div>

            <Input
              id="sale-date"
              label="Sale date"
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              required
            />
          </div>
        </FormSection>

        <FormSection title="Products">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="sale-product" className="mb-2 block text-sm font-medium text-slate-700">
                Select product
              </label>
              <select
                id="sale-product"
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Choose a product</option>
                {products
                  .filter((product) => {
                    const id = getMongoId(product);
                    return !saleItems.some((item) => item.productId === id);
                  })
                  .map((product) => (
                    <option key={getMongoId(product)} value={getMongoId(product)}>
                      {product.productName || "Unnamed product"}
                      {product.sku ? ` — ${product.sku}` : ""}
                      {" · "}
                      {formatAmount(getProductPrice(product))}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                onClick={addProduct}
                disabled={!selectedProductId || Boolean(lookupError)}
                className="w-full sm:w-auto"
              >
                Add product
              </Button>
            </div>
          </div>

          {products.length === 0 && !lookupError && (
            <p className="text-sm text-amber-700">
              No active, inventory-tracked products with a valid selling price are available.
            </p>
          )}

          {saleItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No products added yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["Product", "Unit price", "Quantity", "Line discount", "Line total", ""].map((heading) => (
                      <th key={heading || "actions"} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {saleItems.map((item) => {
                    const product = products.find(
                      (candidate) => getMongoId(candidate) === item.productId
                    );
                    const price = getProductPrice(product) ?? 0;
                    const quantity = Number(item.quantity || 0);
                    const discount = Number(item.discount || 0);
                    const lineTotal = Math.max(0, price * quantity - discount);

                    return (
                      <tr key={item.productId}>
                        <td className="min-w-48 px-3 py-3">
                          <p className="text-sm font-medium text-slate-800">
                            {product?.productName || "Product"}
                          </p>
                          <p className="text-xs text-slate-500">{product?.sku || ""}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">
                          {formatAmount(price)}
                        </td>
                        <td className="w-28 px-3 py-3">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) => updateSaleItem(item.productId, "quantity", event.target.value)}
                            className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                            aria-label={`Quantity for ${product?.productName || "product"}`}
                          />
                        </td>
                        <td className="w-36 px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount}
                            onChange={(event) => updateSaleItem(item.productId, "discount", event.target.value)}
                            className="w-32 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                            aria-label={`Line discount for ${product?.productName || "product"}`}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-800">
                          {formatAmount(lineTotal)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button
                            type="button"
                            variant="danger"
                            className="px-3 py-2"
                            onClick={() => removeSaleItem(item.productId)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-500">
            The backend checks available stock in the selected warehouse when you submit the sale. A sale is rejected if the warehouse has insufficient stock.
          </p>
        </FormSection>

        <FormSection title="Payment and totals">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="sale-discount"
              label="Sale discount (amount)"
              type="number"
              min="0"
              step="0.01"
              value={saleDiscount}
              onChange={(event) => setSaleDiscount(event.target.value)}
            />
            <Input
              id="sale-paid-amount"
              label="Paid amount"
              type="number"
              min="0"
              step="0.01"
              value={paidAmount}
              onChange={(event) => setPaidAmount(event.target.value)}
            />

            <div>
              <label htmlFor="sale-payment-method" className="mb-2 block text-sm font-medium text-slate-700">
                Payment method {numericPaidAmount > 0 && <span className="text-red-600">*</span>}
              </label>
              <select
                id="sale-payment-method"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>

            <Input
              id="sale-payment-reference"
              label="Payment reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Optional transaction or cheque reference"
            />

            <div className="md:col-span-2">
              <label htmlFor="sale-payment-comment" className="mb-2 block text-sm font-medium text-slate-700">
                Payment comment
              </label>
              <textarea
                id="sale-payment-comment"
                rows="2"
                value={paymentComment}
                onChange={(event) => setPaymentComment(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="Optional note about the initial payment"
              />
            </div>
          </div>

          <div className="ml-auto max-w-md space-y-2 rounded-lg bg-slate-50 p-4">
            <div className="flex justify-between gap-4 text-sm text-slate-600">
              <span>Subtotal</span><span>{formatAmount(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm text-slate-600">
              <span>Product discounts</span><span>− {formatAmount(lineDiscountTotal)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm text-slate-600">
              <span>Sale discount</span><span>− {formatAmount(numericSaleDiscount)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
              <span>Total</span><span>{formatAmount(totalAmount)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm text-emerald-700">
              <span>Paid</span><span>{formatAmount(numericPaidAmount)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm font-semibold text-slate-800">
              <span>Due</span><span>{formatAmount(dueAmount)}</span>
            </div>
          </div>
        </FormSection>

        <FormSection title="Additional information">
          <div>
            <label htmlFor="sale-remarks" className="mb-2 block text-sm font-medium text-slate-700">
              Remarks
            </label>
            <textarea
              id="sale-remarks"
              rows="3"
              maxLength="1000"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Optional sale remarks (maximum 1000 characters)"
            />
          </div>
        </FormSection>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => navigate("/sales")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={
              isSubmitting ||
              Boolean(lookupError) ||
              customers.length === 0 ||
              warehouses.length === 0 ||
              products.length === 0
            }
          >
            {isSubmitting ? "Creating sale..." : "Create Sale"}
          </Button>
        </div>
      </form>
    </div>
  );
}
