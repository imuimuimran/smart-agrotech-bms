import express from 'express';
import * as poController from './purchase.controller.js';
// import { protectRoute, restrictTo } from '../../middlewares/auth.middleware.js'; 
// Replace with your project's active security middleware modules
// import { authenticateToken, checkRBAC } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Base Document Querying and Formulations
router.post('/', poController.handleCreatePO);
router.get('/', poController.handleGetPOs);

// Command-Oriented State Protection Endpoints
router.post('/:id/submit', poController.handleSubmitPO);
router.post('/:id/approve', poController.handleApprovePO); // e.g., restrictTo('manager', 'admin')
router.post('/:id/send', poController.handleSendPO);
router.post('/:id/cancel', poController.handleCancelPO);

export default router;
