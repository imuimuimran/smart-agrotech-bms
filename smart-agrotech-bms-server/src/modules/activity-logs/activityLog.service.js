import { ActivityLog } from './activityLog.model.js';
import QueryBuilder from '../../builder/QueryBuilder.js';

/**
 * Centralized logging mechanism to write immutable server-controlled audit trail records.
 * 
 * @param {Object} params - The log registration payload parameters.
 * @param {string|Object} params.user - The Mongoose ObjectId or reference string of the authenticated user actor.
 * @param {string} params.action - Controlled action constant string (from ACTIVITY_ACTIONS).
 * @param {string} params.module - Controlled system module domain constant string (from ACTIVITY_MODULES).
 * @param {string|Object|null} [params.entityId=null] - Optional reference target identifier (e.g., product/supplier publicId or ObjectId).
 * @param {string} [params.description=''] - Optional human-readable presentation context summary.
 * @param {Object|null} [params.metadata=null] - Optional structured key contextual data changes (e.g., oldStatus, amount).
 * @param {Object|null} [params.session=null] - Optional active MongoDB/Mongoose transaction session context.
 * @returns {Promise<Object>} The cleanly created and saved ActivityLog document.
 */
const logActivity = async ({
  user,
  action,
  module,
  entityId = null,
  description = '',
  metadata = null,
  session = null, 
}) => {
  // 1. Structure the data payload matching your defined Schema contract
  const activityData = {
    userId: user,
    action,
    module,
    entityId,
    description,
    metadata,
  };

  // 2. Mongoose .create() returns an array when executing over payload inputs inside arrays
  const query = ActivityLog.create([activityData], session ? { session } : {});
  
  // 3. Resolve the execution query promise and extract the created single log document
  const [activity] = await query;
  
  if (!activity) {
    throw new Error('Infrastructure Error: Failed to successfully write accountability trace to activityLogs.');
  }

  return activity;
};

/**
 * High-Throughput Read Pipeline utilizing the system QueryBuilder for safe filtering
 */
const getAllLogsFromDB = async (queryParameters) => {
  // Fall back cleanly to descending chronological layout if no sort string is supplied
  const defaultSort = queryParameters.sort || '-createdAt'; 
  
  const logQueryInstance = new QueryBuilder(
    ActivityLog.find().populate('userId', 'publicId name email role'), // Population bound cleanly to target reference
    { ...queryParameters, sort: defaultSort }
  )
    .search(['action', 'module', 'description']) // Whitelisted text-search boundaries (Rule 10.8.16)
    .filter()
    .sort()
    .paginate();

  const data = await logQueryInstance.modelQuery;
  const meta = await logQueryInstance.countTotal();

  return { data, meta };
};

/**
 * Fetch a single distinct audit event entry by its primary ObjectId mapping
 */
const getSingleLogFromDB = async (id) => {
  const log = await ActivityLog.findById(id).populate('userId', 'publicId name email role');
  return log;
};

export const ActivityLogService = {
  logActivity,
  getAllLogsFromDB,
  getSingleLogFromDB,
};