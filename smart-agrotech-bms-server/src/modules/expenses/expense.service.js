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
 * Updates an active business expense by its publicId.
 * Final Business-Security Boundary: Explicitly purges protected/immutable data elements.
 * 
 * @param {string} publicId - Unique API-facing business tracker identifier
 * @param {Object} payload - The raw partial request changes from the client body
 * @param {Object} reqUser - The authenticated request identity context token object
 * @returns {Promise<Object>} The sanitized updated expense document JSON footprint
 */
const updateExpense = async (publicId, payload, reqUser) => {
  // 1. Revalidate that the target expense exists and is not soft-deleted
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

  // 2. Normalize input through the helper utility
  const normalizedData = normalizeExpensePayload(payload);

  /*
   --------------------------------
   Protected Fields Isolation Layer
   --------------------------------
   */
  delete normalizedData.publicId;
  delete normalizedData.expenseNumber;
  delete normalizedData.createdBy;
  delete normalizedData.updatedBy;
  delete normalizedData.isDeleted;
  delete normalizedData.deletedAt;
  delete normalizedData.deletedBy;
  delete normalizedData.createdAt;
  delete normalizedData.updatedAt;

  /*
   --------------------------------
   Defensive Amount Validation
   --------------------------------
   */
  if (
    normalizedData.amount !== undefined &&
    Number(normalizedData.amount) <= 0
  ) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      EXPENSE_MESSAGES.INVALID_AMOUNT
    );
  }

  /*
   --------------------------------
   Server-Controlled Audit Tracking
   --------------------------------
   */
  normalizedData.updatedBy = reqUser.id || reqUser.publicId;

  // 3. Persist modifications using atomic $set operators
  const updatedExpense = await Expense.findOneAndUpdate(
    {
      publicId,
      isDeleted: false,
    },
    {
      $set: normalizedData,
    },
    {
      new: true, // Returns the newly mutated document
      runValidators: true, // Forces Mongoose schema-level checks
    }
  );

  if (!updatedExpense) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      EXPENSE_MESSAGES.NOT_FOUND
    );
  }

  return sanitizeExpense(updatedExpense); // Return sanitized representation mapping layer
};


export const ExpenseService = {
  createExpense,
  getExpenses,
  getExpenseByPublicId,
  updateExpense,
};
