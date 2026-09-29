import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import { ReturnFinancialReconciliationService } from "./returnFinancialReconciliation.service.js";

/**
 * Executes financial reconciliation for a completed Customer Sales Return or Exchange.
 * Route: POST /api/v1/accounting/reconcile/sales/:publicId
 */
const reconcileCustomerReturn = catchAsync(async (req, res) => {
  const result = await ReturnFinancialReconciliationService.reconcileCustomerReturn(
    req.params.publicId,
    req.user
  );

  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Customer financial reconciliation posted successfully.",
    data: result,
  });
});

/**
 * Executes financial reconciliation for a completed Vendor Purchase Return or Exchange.
 * Route: POST /api/v1/accounting/reconcile/purchases/:publicId
 */
const reconcileSupplierReturn = catchAsync(async (req, res) => {
  const result = await ReturnFinancialReconciliationService.reconcileSupplierReturn(
    req.params.publicId,
    req.user
  );

  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Supplier financial reconciliation posted successfully.",
    data: result,
  });
});

export const ReturnFinancialReconciliationController = {
  reconcileCustomerReturn,
  reconcileSupplierReturn,
};
