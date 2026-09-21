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

export const PurchaseReturnController = {
  createPurchaseReturn,
};
