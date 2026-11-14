
import { useState } from "react";
import { CustomerService } from "../../services/customerService";
import { Button } from "../../components/ui/Button";

function getDeleteErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 400) {
    return (
      data?.message ||
      "This customer cannot be deleted. Check the outstanding balance."
    );
  }

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "Only an ADMIN can delete customers.";
  }

  if (status === 404) {
    return "This customer could not be found. It may already have been deleted.";
  }

  if (status === 409) {
    return data?.message || "The customer cannot be deleted because of a conflict.";
  }

  if (!error?.response) {
    return "Could not connect to the server. Check your connection and try again.";
  }

  return (
    data?.message ||
    error?.message ||
    "Customer deletion failed. Please try again."
  );
}

export default function CustomerDeleteDialog({
  customer,
  onClose,
  onDeleted,
  onStale,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!customer) return null;

  async function handleDelete() {
    if (isDeleting) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const response = await CustomerService.deleteCustomer(
        customer.publicId
      );

      if (response?.success !== true) {
        throw new Error(
          response?.message || "The server did not confirm deletion."
        );
      }

      onDeleted?.();
    } catch (error) {
      if (error?.response?.status === 404) {
        // The record may already have been deleted elsewhere.
        onStale?.();
      } else {
        setErrorMessage(getDeleteErrorMessage(error));
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-delete-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="customer-delete-title"
          className="text-lg font-bold text-slate-900"
        >
          Delete Customer
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Are you sure you want to delete this customer?
        </p>

        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">
            {customer.name}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {customer.publicId}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Current balance: BDT{" "}
            {Number(customer.currentBalance || 0).toLocaleString("en-BD")}
          </p>
        </div>

        <p className="mt-3 text-sm text-amber-700">
          This operation soft-deletes the customer. Customers with a
          positive outstanding balance cannot be deleted.
        </p>

        {errorMessage && (
          <div
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isDeleting}
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="danger"
            isLoading={isDeleting}
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? "Deleting..." : "Delete Customer"}
          </Button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Only an ADMIN can perform this action.
        </p>
      </section>
    </div>
  );
}
