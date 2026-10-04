import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import { ReportService } from "./report.service.js";
import { REPORT_MESSAGES } from "./report.constants.js";

const getSalesReport = catchAsync(async (req, res) => {
  const result = await ReportService.getSalesReport(req.query);
  
  // FIX: Extracted res out as the first parameter to align with standard project helpers
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: REPORT_MESSAGES.SALES_FETCH_SUCCESS,
    data: result,
  });
});

const getPurchaseReport = catchAsync(async (req, res) => {
  const result = await ReportService.getPurchaseReport(req.query);
  
  // Clean architectural pattern: pass res directly as the first argument
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: REPORT_MESSAGES.PURCHASE_FETCH_SUCCESS,
    data: result,
  });
});

const getCurrentStockReport = catchAsync(async (req, res) => {
  const data = await ReportService.getCurrentStockReport();
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: REPORT_MESSAGES.CURRENT_STOCK_FETCH_SUCCESS,
    data,
  });
});

const getLowStockReport = catchAsync(async (req, res) => {
  const data = await ReportService.getLowStockReport();
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: REPORT_MESSAGES.LOW_STOCK_FETCH_SUCCESS,
    data,
  });
});

const getOutOfStockReport = catchAsync(async (req, res) => {
  const data = await ReportService.getOutOfStockReport();
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: REPORT_MESSAGES.OUT_OF_STOCK_FETCH_SUCCESS,
    data,
  });
});

const getInventoryMovementReport = catchAsync(async (req, res) => {
  const data = await ReportService.getInventoryMovementReport(req.query);
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: REPORT_MESSAGES.INVENTORY_MOVEMENT_FETCH_SUCCESS,
    data,
  });
});

const getExpenseReport = catchAsync(async (req, res) => {
  const result = await ReportService.getExpenseReport(req.query);
  
  // Signature Fix: pass res cleanly as the first independent argument
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: REPORT_MESSAGES.EXPENSE_FETCH_SUCCESS,
    data: result,
  });
});

export const ReportController = {
  getSalesReport,
  getPurchaseReport,
  getCurrentStockReport,
  getLowStockReport,
  getOutOfStockReport,
  getInventoryMovementReport,
  getExpenseReport,
};
