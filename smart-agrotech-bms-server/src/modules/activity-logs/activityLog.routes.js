import express from 'express';
import verifyToken from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/authorize.middleware.js'; 
import { ActivityLogController } from './activityLog.controller.js';

const router = express.Router();

// Read API endpoints are locked behind authentication and RBAC
router.get(
  '/',
  verifyToken,
  authorize('Admin'), // Restricting to Admin context safely by default
  ActivityLogController.getActivityLogs
);

router.get(
  '/:id',
  verifyToken,
  authorize('Admin'),
  ActivityLogController.getSingleActivityLog
);

export const ActivityLogRoutes = router;
