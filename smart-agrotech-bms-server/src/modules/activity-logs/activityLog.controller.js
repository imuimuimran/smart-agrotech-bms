import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../shared/ApiError.js';
import { ActivityLogService } from './activityLog.service.js';

const getActivityLogs = async (req, res, next) => {
  try {
    const result = await ActivityLogService.getAllLogsFromDB(req.query);
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Audit trail history logs retrieved successfully.',
      meta: result.meta,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleActivityLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const log = await ActivityLogService.getSingleLogFromDB(id);

    if (!log) {
      throw new ApiError(httpStatus.NOT_FOUND, 'The requested activity log record could not be found.');
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Detailed audit log event information resolved successfully.',
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

export const ActivityLogController = {
  getActivityLogs,
  getSingleActivityLog,
};
