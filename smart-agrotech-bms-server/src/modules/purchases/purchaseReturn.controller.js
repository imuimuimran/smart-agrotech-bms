import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import { PurchaseReturnService } from "./purchaseReturn.service.js";
import { PURCHASE_RETURN_MESSAGES } from "./purchaseReturn.constants.js";

/**
 * Handle creation flow transitions for initiating Purchase Returns or Exchanges.
 * Leverages the project's standard payload destructuring and catchAsync wrapper.
 */
const createPurchaseReturn = catchAsync(async (req, res) => {
  // Pass req.body and req.user safely down into the atomic service layer
  const result = await PurchaseReturnService.createPurchaseReturn(req.body, req.user);

  sendResponse({
    res,
    statusCode: HTTP_STATUS.CREATED,
    success: true,
    message: PURCHASE_RETURN_MESSAGES.CREATE_SUCCESS,
    data: result,
  });
});


/**
 * Transition state workflow: DRAFT → PENDING_APPROVAL
 */
const submitPurchaseReturn = catchAsync(async (req, res) => {
  const result = await PurchaseReturnService.submitPurchaseReturnForApproval(
    req.params.publicId,
    req.user
  );

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: "Purchase return successfully submitted for approval.",
    data: result,
  });
});

/**
 * Transition state workflow: PENDING_APPROVAL → APPROVED
 */
const approvePurchaseReturn = catchAsync(async (req, res) => {
  const result = await PurchaseReturnService.approvePurchaseReturn(
    req.params.publicId,
    req.user
  );

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: "Purchase return successfully approved.",
    data: result,
  });
});

/**
 * Transition state workflow: PENDING_APPROVAL → REJECTED
 */
const rejectPurchaseReturn = catchAsync(async (req, res) => {
  const result = await PurchaseReturnService.rejectPurchaseReturn(
    req.params.publicId,
    req.body,
    req.user
  );

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: "Purchase return request successfully rejected.",
    data: result,
  });
});

/**
 * Transition state workflow: DRAFT / PENDING_APPROVAL → CANCELLED
 */
const cancelPurchaseReturn = catchAsync(async (req, res) => {
  const result = await PurchaseReturnService.cancelPurchaseReturn(
    req.params.publicId,
    req.user
  );

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: "Purchase return request successfully cancelled.",
    data: result,
  });
});


export const PurchaseReturnController = {
  createPurchaseReturn,
  submitPurchaseReturn,
  approvePurchaseReturn,
  rejectPurchaseReturn,
  cancelPurchaseReturn,
};
