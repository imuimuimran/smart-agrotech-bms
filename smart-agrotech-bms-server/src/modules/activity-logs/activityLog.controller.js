import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import HTTP_STATUS from '../../constants/httpStatus.js';
import ApiError from '../../shared/ApiError.js';
import { ActivityLogService } from './activityLog.service.js';

const getActivityLogs = async (req, res, next) => {
  try {
    const result = await ActivityLogService.getAllLogsFromDB(req.query);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Audit trail history logs retrieved successfully.',
      meta: result.meta,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

// const getSingleActivityLog = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const log = await ActivityLogService.getSingleLogFromDB(id);

//     if (!log) {
//       throw new ApiError(HTTP_STATUS.NOT_FOUND, 'The requested activity log record could not be found.');
//     }

//     res.status(HTTP_STATUS.OK).json({
//       success: true,
//       message: 'Detailed audit log event information resolved successfully.',
//       data: log,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

/**
 * Retrieves a single immutable activity log record by its ID.
 */
const getSingleActivityLog = catchAsync(async (req, res) => {
  const result = await ActivityLogService.getSingleLogFromDB(req.params.id);
  
  if (!result) {
    return sendResponse(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      success: false,
      message: "Activity log not found",
    });
  }

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Activity log retrieved successfully",
    data: result,
  });
});

/**
 * Retrieves paginated list of system activity logs via QueryBuilder.
 */
const getAllActivityLogs = catchAsync(async (req, res) => {
  const result = await ActivityLogService.getAllLogsFromDB(req.query);
  
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Activity logs retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const ActivityLogController = {
  getActivityLogs,
  getSingleActivityLog,
  getAllActivityLogs,
};
