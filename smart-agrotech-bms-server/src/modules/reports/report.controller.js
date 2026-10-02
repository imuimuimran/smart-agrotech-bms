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

export const ReportController = {
  getSalesReport,
  getPurchaseReport,
};
