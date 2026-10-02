import HTTP_STATUS from "../../constants/httpStatus.js"; 
import ApiError from "../../shared/ApiError.js";       
import { REPORT_PERIODS } from "./report.constants.js";

/**
 * Calculates start and end timestamps safely for an optimized date match boundary.
 * All boundaries enforce full-day coverage (00:00:00.000 to 23:59:59.999).
 */
const getDateRange = ({ period, startDate, endDate }) => {
  const now = new Date();
  let start;
  let end;

  switch (period) {
    case REPORT_PERIODS.DAILY: {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case REPORT_PERIODS.MONTHLY: {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case REPORT_PERIODS.YEARLY: {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    }
    case REPORT_PERIODS.CUSTOM: {
      if (!startDate || !endDate) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "startDate and endDate are required for custom reports."
        );
      }
      start = new Date(startDate);
      end = new Date(endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Invalid report date range."
        );
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    default:
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid report period."
      );
  }

  if (start > end) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Start date cannot be greater than end date."
    );
  }

  return { start, end };
};

export { getDateRange };
