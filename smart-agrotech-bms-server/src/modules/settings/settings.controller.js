import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import { SettingsService, SETTINGS_MESSAGES } from "./settings.service.js";

/**
 * Handles systemic requests to retrieve the global configuration matrix.
 */
const getSettings = catchAsync(async (req, res) => {
  const settings = await SettingsService.getSettings();
  
  // FIX: Extracted res out as the first independent argument to fulfill system standard signatures
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: SETTINGS_MESSAGES.FETCH_SUCCESS,
    data: settings,
  });
});

/**
 * Processes requests to update system-wide global variables.
 */
const updateSettings = catchAsync(async (req, res) => {
  const settings = await SettingsService.updateSettings(
    req.body,
    req.user.id
  );
  
  // FIX: Extracted res out as the first independent argument to fulfill system standard signatures
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: SETTINGS_MESSAGES.UPDATE_SUCCESS,
    data: settings,
  });
});

export const SettingsController = {
  getSettings,
  updateSettings,
};
