import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import { Settings } from "./settings.model.js"; // FIX: Enforce strict explicit named import hooks

const SETTINGS_MESSAGES = Object.freeze({
  FETCH_SUCCESS: "Settings retrieved successfully.",
  UPDATE_SUCCESS: "Settings updated successfully.",
  NOT_FOUND: "Settings not found.",
});

const NESTED_SETTINGS_FIELDS = [
  "businessLogo",
  "invoiceSettings",
  "backupSettings",
];

const GLOBAL_SINGLETON_KEY = "SET-GLOBAL-001"; // Fixed identifier to prevent duplicate records

const mergeNestedObject = (currentValue, incomingValue) => {
  const current = currentValue?.toObject?.() ?? currentValue ?? {};
  return {
    ...current,
    ...incomingValue,
  };
};

/**
 * Retrieves the system-wide singleton settings configuration record.
 * Generates the master document automatically with baseline defaults if it is missing.
 */
const getSettings = async () => {
  // Guard concurrency by targeting our explicit singleton identifier key
  let settings = await Settings.findOne({ publicId: GLOBAL_SINGLETON_KEY });
  if (!settings) {
    settings = await Settings.create({ publicId: GLOBAL_SINGLETON_KEY });
  }
  return settings;
};

/**
 * Modifies the system-wide settings record.
 * Merges nested parameter configuration sets and records the admin actor footprint.
 */
const updateSettings = async (payload, userId) => {
  if (!payload || Object.keys(payload).length === 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "At least one setting must be provided."
    );
  }

  // IANA Time Zone Verification Firewall Check
  if (payload.timeZone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: payload.timeZone });
    } catch (error) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Invalid IANA time zone identifier supplied: '${payload.timeZone}'.`
      );
    }
  }

  let settings = await Settings.findOne({ publicId: GLOBAL_SINGLETON_KEY });
  if (!settings) {
    settings = await Settings.create({
      ...payload,
      publicId: GLOBAL_SINGLETON_KEY,
      updatedBy: userId,
    });
    return settings;
  }

  const updates = { ...payload };
  for (const field of NESTED_SETTINGS_FIELDS) {
    if (payload[field] !== undefined) {
      updates[field] = mergeNestedObject(
        settings[field],
        payload[field]
      );
    }
  }

  settings.set({
    ...updates,
    updatedBy: userId,
  });

  await settings.save();
  return settings;
};

export const SettingsService = {
  getSettings,
  updateSettings,
};

export { SETTINGS_MESSAGES };
