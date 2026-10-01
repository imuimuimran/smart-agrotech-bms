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

export const ExpenseController = {
  createExpense,
  getExpenses,
};
