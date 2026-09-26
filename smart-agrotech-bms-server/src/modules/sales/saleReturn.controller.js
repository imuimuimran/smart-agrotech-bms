import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import { SaleReturnService } from "./saleReturn.service.js";

/**
 * Creates a new Sales Return document initializing in a DRAFT state.
 */
const createSaleReturn = catchAsync(async (req, res) => {
  const saleReturn = await SaleReturnService.createSaleReturn(req.body, req.user);
  
  sendResponse({
    res,
    statusCode: HTTP_STATUS.CREATED,
    success: true,
    message: "Sales return created successfully.",
    data: saleReturn,
  });
});

/**
 * Transitions state workflow: DRAFT → PENDING_APPROVAL
 */
const submitSaleReturn = catchAsync(async (req, res) => {
  const saleReturn = await SaleReturnService.submitSaleReturn(req.params.publicId, req.user);
  
  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Sales return submitted for approval successfully.",
    data: saleReturn,
  });
});

/**
 * Transitions state workflow: PENDING_APPROVAL → APPROVED
 */
const approveSaleReturn = catchAsync(async (req, res) => {
  const saleReturn = await SaleReturnService.approveSaleReturn(req.params.publicId, req.user);
  
  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Sales return approved successfully.",
    data: saleReturn,
  });
});

/**
 * Transitions state workflow: PENDING_APPROVAL → REJECTED
 */
const rejectSaleReturn = catchAsync(async (req, res) => {
  const saleReturn = await SaleReturnService.rejectSaleReturn(
    req.params.publicId,
    req.user,
    req.body?.remarks
  );
  
  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Sales return rejected successfully.",
    data: saleReturn,
  });
});

/**
 * Transitions state workflow: DRAFT / PENDING_APPROVAL → CANCELLED
 */
const cancelSaleReturn = catchAsync(async (req, res) => {
  const saleReturn = await SaleReturnService.cancelSaleReturn(
    req.params.publicId,
    req.user,
    req.body?.remarks
  );
  
  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Sales return cancelled successfully.",
    data: saleReturn,
  });
});

/**
 * ============================================================
 * PROCESS SALES RETURN
 * ============================================================
 * Executes inbound inventory tracking updates and checks stock rules atomically.
 */
const processSaleReturn = catchAsync(async (req, res) => {
  const saleReturn = await SaleReturnService.processSaleReturn(
    req.params.publicId,
    req.user
  );

  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Sales return processed successfully.",
    data: saleReturn,
  });
});

export const SaleReturnController = {
  createSaleReturn,
  submitSaleReturn,
  approveSaleReturn,
  rejectSaleReturn,
  cancelSaleReturn,
  processSaleReturn,
};
