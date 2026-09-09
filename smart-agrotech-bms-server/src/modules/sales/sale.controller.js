import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import { SaleService } from "./sale.service.js";
import { SALE_MESSAGES } from "./sale.constants.js";

/**
 * Handle creation flow transitions for fresh corporate sales.
 */
const createSale = catchAsync(async (req, res) => {
  const sale = await SaleService.createSale(req.body, req.user);
  
  sendResponse({
    res,
    statusCode: HTTP_STATUS.CREATED,
    message: SALE_MESSAGES.CREATE_SUCCESS,
    data: sale,
  });
});

/**
 * Handle search queries, filter matrices, sorting, and pagination parameters.
 */
const getSales = catchAsync(async (req, res) => {
  const result = await SaleService.getSales(req.query);
  
  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    message: SALE_MESSAGES.FETCH_SUCCESS,
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Extract single distinct transactions bounded securely by unique business public IDs.
 */
const getSaleByPublicId = catchAsync(async (req, res) => {
  const sale = await SaleService.getSaleByPublicId(req.params.publicId);
  
  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    message: SALE_MESSAGES.FETCH_SINGLE_SUCCESS,
    data: sale,
  });
});

/**
 * Processes debt collections and settlement records against outstanding invoice balances.
 */
const recordSalePayment = catchAsync(async (req, res) => {
  const result = await SaleService.recordSalePayment(
    req.params.publicId,
    req.body,
    req.user
  );

  sendResponse({
    res,
    statusCode: HTTP_STATUS.CREATED,
    message: SALE_MESSAGES.PAYMENT_SUCCESS,
    data: result,
  });
});

export const SaleController = {
  createSale,
  getSales,
  getSaleByPublicId,
  recordSalePayment,
};
