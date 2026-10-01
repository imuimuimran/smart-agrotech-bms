/**
 * Normalizes client payload inputs by stripping out un-whitelisted data structures.
 */
export const normalizeExpensePayload = (payload) => ({
  category: payload.category,
  amount: payload.amount,
  expenseDate: payload.expenseDate,
  paymentMethod: payload.paymentMethod,
  reference: payload.reference?.trim() || "",
  description: payload.description?.trim() || "",
  status: payload.status,
});

/**
 * Transforms sequence integers into the enterprise unique tracker code format.
 */
export const formatExpensePublicId = (sequence) => {
  return `EXP-${String(sequence).padStart(8, "0")}`;
};

/**
 * Transforms sequence integers into the consecutive document serial number format.
 */
export const formatExpenseNumber = (sequence) => {
  return `EXPNUM-${String(sequence).padStart(6, "0")}`;
};

/**
 * Sanitizes Mongoose model instances to mask raw database fields.
 * Enhanced: Preserves soft-delete auditing states for historical record tracing.
 */
export const sanitizeExpense = (expense) => {
  const doc = expense.toObject ? expense.toObject() : expense;
  return {
    publicId: doc.publicId,
    expenseNumber: doc.expenseNumber,
    category: doc.category,
    amount: doc.amount ? doc.amount.toString() : "0.00",
    expenseDate: doc.expenseDate,
    paymentMethod: doc.paymentMethod,
    reference: doc.reference,
    description: doc.description,
    status: doc.status,
    isDeleted: doc.isDeleted ?? false, // Preserved for audit transparency
    deletedAt: doc.deletedAt ?? null, // Preserved for audit transparency
    deletedBy: doc.deletedBy ?? null, // Preserved for audit transparency
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};
