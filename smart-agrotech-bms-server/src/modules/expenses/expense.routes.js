import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import validateRequest from "../../middlewares/validate.middleware.js";
import ROLES from "../../constants/roles.js";
import { ExpenseController } from "./expense.controller.js";
import { 
  createExpenseSchema,
  updateExpenseSchema,
  expensePublicIdParamSchema, 
} from "./expense.validation.js";

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

/**
 * Get Single Expense By Public Tracer ID
 * Route: GET /api/v1/expenses/:publicId
 * Permissions: Admin Only (Strict Financial Isolation)
 */
router.get(
  "/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(expensePublicIdParamSchema),
  ExpenseController.getExpenseByPublicId
);

/**
 * Update Expense Record By Public Identifier
 * Route: PATCH /api/v1/expenses/:publicId
 * Permissions: Admin Only (Financial Writing Isolation Protection)
 */
router.patch(
  "/:publicId",
  verifyToken,
  authorize(ROLES.ADMIN),
  validateRequest(updateExpenseSchema),
  ExpenseController.updateExpense
);

export default router;
