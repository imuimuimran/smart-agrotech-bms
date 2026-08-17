import express from 'express';
import * as poController from './purchase.controller.js';
import * as approvalController from './purchase.controller.js';
import * as commController from './purchase.controller.js';
// import { protectRoute, restrictTo } from '../../middlewares/auth.middleware.js'; 
// Replace with your project's active security middleware modules
// import { authenticateToken, checkRBAC } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// // Base Document Querying and Formulations
// router.post('/', poController.handleCreatePO);
// router.get('/', poController.handleGetPOs);

// // Command-Oriented State Protection Endpoints
// router.post('/:id/submit', poController.handleSubmitPO);
// router.post('/:id/approve', poController.handleApprovePO); // e.g., restrictTo('manager', 'admin')
// router.post('/:id/send', poController.handleSendPO);
// router.post('/:id/cancel', poController.handleCancelPO);


// Command-Isolated State Machine Routing Map
router.post('/:id/submit', approvalController.handleSubmitPO);
router.post('/:id/start-review', approvalController.handleStartPOReview);
router.post('/:id/approve', approvalController.handleApprovePO);
router.post('/:id/reject', approvalController.handleRejectPO);
router.post('/:id/revise', approvalController.handleReviseRejectedPO);

// Dedicated Command Endpoint Structure
router.post(
  '/:id/send', 
  // protectRoute, 
  // restrictTo(['staff', 'manager', 'admin']), // RBAC enforcement bounds
  commController.handleSendPOToSupplier
);

// History Audit Log Fetching Path
router.get(
  '/:id/communications', 
  // protectRoute,
  commController.handleGetPOCommunications
);

// Audit History Fetch Endpoint
router.get('/:id/approval-history', approvalController.handleGetPOHistory);

export default router;
