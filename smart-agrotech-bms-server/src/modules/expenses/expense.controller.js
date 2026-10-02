import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import { ExpenseService } from "./expense.service.js";
import { EXPENSE_MESSAGES } from "./expense.constants.js";

/**
 * Create a new business expense record.
 * Route: POST /api/v1/expenses
 */
const createExpense = catchAsync(async (req, res) => {
  // Delegate execution and pass payload + user identity context down cleanly
  const expense = await ExpenseService.createExpense(req.body, req.user);

  sendResponse({
    res,
    statusCode: HTTP_STATUS.CREATED,
    message: EXPENSE_MESSAGES.CREATE_SUCCESS,
    data: expense,
  });
});


/**
 * Fetch and list sanitized business expenses.
 */
const getExpenses = catchAsync(async (req, res) => {
  const result = await ExpenseService.getExpenses(req.query);

  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    message: EXPENSE_MESSAGES.FETCH_SUCCESS,
    meta: result.meta,
    data: result.data,
  });
});


/**
 * Retrieve one distinct business expense by route parameters.
 * Route: GET /api/v1/expenses/:publicId
 */
const getExpenseByPublicId = catchAsync(async (req, res) => {
  const expense = await ExpenseService.getExpenseByPublicId(
    req.params.publicId
  );

  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    message: EXPENSE_MESSAGES.FETCH_SINGLE_SUCCESS,
    data: expense,
  });
});

/**
 * Update an existing business expense by route parameters.
 * Route: PATCH /api/v1/expenses/:publicId
 */
const updateExpense = catchAsync(async (req, res) => {
  const expense = await ExpenseService.updateExpense(
    req.params.publicId,
    req.body,
    req.user
  );

  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    message: EXPENSE_MESSAGES.UPDATE_SUCCESS, // Uses established project success naming convention
    data: expense,
  });
});


/**
 * Soft-delete / Void a business expense record.
 * Route: DELETE /api/v1/expenses/:publicId
 */
const deleteExpense = catchAsync(async (req, res) => {
  // If your expense service doesn't have deleteExpense yet, we pass a temporary success message
  // Or delegate to the service layer if it exists. For now, this resolves the ReferenceError.
  const result = await ExpenseService.updateExpense(
    req.params.publicId, 
    { status: "VOIDED", isDeleted: true, deletedAt: new Date(), deletedBy: req.user.id }, 
    req.user
  );

  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    message: EXPENSE_MESSAGES.DELETE_SUCCESS,
    data: result,
  });
});

/**
 * Fetch complete historical audit trails of business expenses.
 * Route: GET /api/v1/expenses/history
 */
const getExpenseHistory = catchAsync(async (req, res) => {
  const result = await ExpenseService.getExpenseHistory(req.query);

  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    message: EXPENSE_MESSAGES.HISTORY_FETCH_SUCCESS,
    meta: result.meta,
    data: result.data,
  });
});

export const ExpenseController = {
  createExpense,
  getExpenses,
  getExpenseByPublicId,
  updateExpense,
  deleteExpense,
  getExpenseHistory,
};