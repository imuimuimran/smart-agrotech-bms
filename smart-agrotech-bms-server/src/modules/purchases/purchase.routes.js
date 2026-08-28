import express from 'express';
import * as poController from './purchase.controller.js';
import * as approvalController from './purchase.controller.js';
import * as commController from './purchase.controller.js';
import * as controller from './purchase.controller.js'; 
import * as receiptController from './purchase.controller.js';
import * as discrepancyController from './purchase.controller.js';
import * as purchaseController from './purchase.controller.js';
import * as invoiceController from './purchase.controller.js'; // Aligned command boundary import (Page 2)
import { createPurchaseInvoiceSchema } from './purchase.validation.js';
// Replace with the project's exact current authentication modules:
// import { protectRoute, restrictTo } from '../../middlewares/auth.middleware.js'; 
// Replace with your project's active security middleware modules
// import { authenticateToken, checkRBAC } from '../../middlewares/auth.middleware.js';

// Import active system shared security middleware layers (Page 3)
// Modify these import targets if your core app files reside in a different folder:
import { verifyToken, authorize, validateRequest } from '../../middlewares/auth.middleware.js';
import { ROLES } from '../../constants/roles.js'; // Reuses your project's active roles enum matrix


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

// Inward Action-Oriented Supplier Event Boundary Capture Entry point
router.post(
  '/:id/supplier-response',
  // protectRoute, // Injects user session verification layers
  controller.handleSupplierResponseSubmission
);

router.post('/goods-receipts', receiptController.handleInitializeReceipt);
router.post('/goods-receipts/:id/inspection', receiptController.handleFinalizeReceiptInspection); // Finalize action mapping

// Action-Oriented Exception Boundary Endpoints
router.post('/goods-receipts/:receiptId/discrepancies', discrepancyController.handleRaiseDiscrepancy);
router.post('/receiving-discrepancies/:id/resolve', discrepancyController.handleProposeResolution);



router.post(
  '/purchase-invoices',
  verifyToken,                                        // 1. Confirms secure token presence
  authorize(ROLES.ADMIN, ROLES.FINANCE_MANAGER),      // 2. Enforces RBAC permissions check (Page 3-4)
  validateRequest(createPurchaseInvoiceSchema),       // 3. Reusable structural data filter (Page 4)
  invoiceController.handleCreatePurchaseInvoice       // 4. Invokes endpoint execution handler
);

// // Expose command-isolated action path matching your endpoint mapping principles (Page 10)
// router.post(
//   '/purchase-invoices/:id/match',
//   verifyToken,
//   authorize(ROLES.ADMIN, ROLES.FINANCE_MANAGER),
//   purchaseController.handleExecuteInvoiceMatching
// );

router.post(
  '/purchase-invoices/:id/match',
  verifyToken,                                            // 1. Decodes and confirms user tracking context (Page 4)
  authorize(ROLES.ADMIN, ROLES.FINANCE_MANAGER),          // 2. Restricts path access server-side (Page 4-5)
  purchaseController.handleMatchPurchaseInvoice           // 3. Invokes non-CRUD execution handler (Page 4)
);

router.post(
  '/purchase-invoices/:id/approve',
  verifyToken,                                              // 1. Decodes and confirms credentials (Page 4)
  authorize(ROLES.MANAGER, ROLES.ADMIN),                    // 2. Enforces baseline system RBAC bounds
  purchaseController.handleApprovePurchaseInvoice           // 3. Invokes lean execution handler (Page 4)
);

// src/modules/purchases/purchase.routes.js

// Action Command Surface Expositions (Page 4)
router.post(
  '/purchase-invoices/:id/reject',
  verifyToken,
  authorize(ROLES.MANAGER, ROLES.ADMIN), // Enforce backend RBAC (Page 4)
  purchaseController.handleRejectPurchaseInvoice
);

router.post(
  '/purchase-invoices/:id/revise',
  verifyToken,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  purchaseController.handleRevisePurchaseInvoice
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
