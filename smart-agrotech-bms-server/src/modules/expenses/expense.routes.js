import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import validateRequest from "../../middlewares/validate.middleware.js";
import ROLES from "../../constants/roles.js";
import { ExpenseController } from "./expense.controller.js";
import { createExpenseSchema } from "./expense.validation.js";

const router = express.Router();

/**
 * Create Expense
 * 
 * Expense management is a highly protected financial operation.
 * Access is restricted exclusively to Admin roles for initial rollout.
 */
router.post(
  "/",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(createExpenseSchema),
  ExpenseController.createExpense
);

/**
 * Get Paginated and Filtered Expenses List
 * Permissions: Admin Only
 */
router.get(
  "/",
  verifyToken,
  authorize(ROLES.ADMIN),
  ExpenseController.getExpenses
);

export default router;
