import Supplier from "./supplier.model.js";

/**
 * Generates an atomic sequential Supplier Public ID (e.g., SUP-100001)
 * @returns {Promise<string>} Next unique public identifier string
 */
export const generateSupplierPublicId = async () => {
  const lastSupplier = await Supplier.findOne()
    .sort({ createdAt: -1 })
    .select("publicId");

  if (!lastSupplier) {
    return "SUP-100001";
  }

  const lastNumber = Number(lastSupplier.publicId.replace("SUP-", ""));
  return `SUP-${String(lastNumber + 1).padStart(6, "0")}`;
};

/**
 * Strips away database meta fields to securely expose public response attributes.
 * @param {Object} supplier - Mongoose document object instance
 * @returns {Object} Cleaned supplier payload schema
 */
export const sanitizeSupplier = (supplier) => ({
  publicId: supplier.publicId,
  supplierName: supplier.supplierName,
  supplierCode: supplier.supplierCode,
  companyName: supplier.companyName,
  supplierType: supplier.supplierType,
  contactPerson: supplier.contactPerson,
  email: supplier.email,
  phone: supplier.phone,
  alternatePhone: supplier.alternatePhone,
  website: supplier.website,
  paymentTerms: supplier.paymentTerms,
  creditLimit: supplier.creditLimit,
  currentPayable: supplier.currentPayable,
  currency: supplier.currency,
  bankAccounts: supplier.bankAccounts,
  address: supplier.address,
  notes: supplier.notes,
  status: supplier.status,
  availableCredit: supplier.availableCredit, // Includes the virtual ledger property
  createdAt: supplier.createdAt,
  updatedAt: supplier.updatedAt,
});
