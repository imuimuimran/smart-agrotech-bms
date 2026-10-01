import HTTP_STATUS from "../../constants/httpStatus.js";
import ApiError from "../../shared/ApiError.js";
import { getNextSequence } from "../../utils/sequence.util.js";
import QueryBuilder from "../../builder/QueryBuilder.js";
import Expense from "./expense.model.js";
import { 
  EXPENSE_MESSAGES,
  EXPENSE_SEARCHABLE_FIELDS,
  EXPENSE_FILTERABLE_FIELDS,
  EXPENSE_SORTABLE_FIELDS 
} from "./expense.constants.js";
import {
  normalizeExpensePayload,
  sanitizeExpense,
  formatExpensePublicId,
  formatExpenseNumber,
} from "./expense.utils.js";

/**
 * Creates a new business expense record.
 * Safe Boundary: Never spreads arbitrary payload fields to prevent property injections.
 *
 * @param {Object} payload - The raw incoming validation request body
 * @param {Object} reqUser - The authenticated request identity context token object
 * @returns {Promise<Object>} The sanitized expense document JSON footprint
 */
const createExpense = async (payload, reqUser) => {
  // 1. Normalize client input parsing blocks
  const normalizedData = normalizeExpensePayload(payload);

  // 2. Defensive amount value validations
  if (!normalizedData.amount || Number(normalizedData.amount) <= 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      EXPENSE_MESSAGES.INVALID_AMOUNT
    );
  }

  // 3. Atomic enterprise public ID sequence retrieval
  const sequence = await getNextSequence("expense");
  const publicId = formatExpensePublicId(sequence); //

  // 4. Atomic business expense document serial generation
  const expenseNumber = formatExpenseNumber(sequence);

  // 5. Construct server-controlled document property maps
  // We align with user object schema fields to pull actor reference hooks correctly
  const finalExpenseData = {
    publicId,
    expenseNumber,
    category: normalizedData.category,
    amount: normalizedData.amount,
    expenseDate: normalizedData.expenseDate,
    paymentMethod: normalizedData.paymentMethod,
    reference: normalizedData.reference || "",
    description: normalizedData.description || "",
    status: normalizedData.status || "ACTIVE",
    createdBy: reqUser.id || reqUser.publicId, // Fallback safe matching for global hooks
    updatedBy: reqUser.id || reqUser.publicId,
  };

  // 6. Persist down to MongoDB collection instances
  const expense = await Expense.create(finalExpenseData);

  // 7. Return sanitized representation mapping layer
  return sanitizeExpense(expense);
};

/**
 * Fetch paginated, filtered, and sorted business expenses from DB.
 */
const getExpenses = async (query) => {
  const expenseQuery = new QueryBuilder(
    Expense.find({ isDeleted: false }),
    query
  )
    .search(EXPENSE_SEARCHABLE_FIELDS)
    .filter(EXPENSE_FILTERABLE_FIELDS)
    .sort(EXPENSE_SORTABLE_FIELDS)
    .paginate()
    .fields();

  const data = await expenseQuery.modelQuery;
  const meta = await expenseQuery.countTotal();

  return {
    meta,
    data: data.map(sanitizeExpense), // Applies server-side sanitation to every item row
  };
};


/**
 * Retrieves a single business expense by its public identifier.
 * Safe Boundary: Rejects lookups against soft-deleted records.
 * 
 * @param {string} publicId - Unique API-facing business identifier string
 * @returns {Promise<Object>} The sanitized expense document structure
 */
const getExpenseByPublicId = async (publicId) => {
  const expense = await Expense.findOne({
    publicId,
    isDeleted: false, // Strict exclusion boundary guard
  });

  if (!expense) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      EXPENSE_MESSAGES.NOT_FOUND
    );
  }

  return sanitizeExpense(expense);
};

/**
 * Updates a single business expense by its public identifier.
 * Safe Boundary: Only maps client-editable parameters and updates audit fields server-side.
 * 
 * @param {string} publicId - Unique API-facing business identifier string
 * @param {Object} payload - The raw incoming validation request body changes
 * @param {Object} reqUser - The authenticated request identity context token object
 * @returns {Promise<Object>} The sanitized updated expense document JSON footprint
 */
const updateExpenseByPublicId = async (publicId, payload, reqUser) => {
  // 1. Fetch document and reject updates against soft-deleted records
  const expense = await Expense.findOne({
    publicId,
    isDeleted: false,
  });

  if (!expense) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      EXPENSE_MESSAGES.NOT_FOUND
    );
  }

  // 2. Normalize and extract client-editable input parameters defensively
  const allowedUpdates = {};
  if (payload.category !== undefined) allowedUpdates.category = payload.category;
  if (payload.expenseDate !== undefined) allowedUpdates.expenseDate = payload.expenseDate;
  if (payload.paymentMethod !== undefined) allowedUpdates.paymentMethod = payload.paymentMethod;
  if (payload.reference !== undefined) allowedUpdates.reference = payload.reference.trim();
  if (payload.description !== undefined) allowedUpdates.description = payload.description.trim();

  // 3. Defensive amount validation check if present in payload
  if (payload.amount !== undefined) {
    if (Number(payload.amount) <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        EXPENSE_MESSAGES.INVALID_AMOUNT
      );
    }
    allowedUpdates.amount = payload.amount;
  }

  // 4. Invariant Protection: Force server-controlled audit fields onto the update parameters
  allowedUpdates.updatedBy = reqUser.id || reqUser.publicId;

  // 5. Execute safe, structured data mutation via Mongoose findOneAndUpdate
  const updatedExpense = await Expense.findOneAndUpdate(
    { _id: expense._id, isDeleted: false },
    { $set: allowedUpdates },
    { new: true } // Returns the newly mutated document format
  );

  return sanitizeExpense(updatedExpense);
};

export const ExpenseService = {
  createExpense,
  getExpenses,
  getExpenseByPublicId,
  updateExpenseByPublicId,
};
