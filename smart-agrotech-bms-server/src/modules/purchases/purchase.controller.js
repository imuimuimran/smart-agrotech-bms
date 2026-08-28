import * as poService from './purchase.service.js';
import * as approvalService from './purchase.service.js';
import * as purchaseInvoiceService from './purchase.service.js';
import * as communicationService from './purchase.service.js';
import * as validation from './purchase.validation.js';
import * as service from './purchase.service.js';
import { 
  createPOSchema, 
  poApprovalDecisionSchema, 
  poRejectionDecisionSchema 
} from './purchase.validation.js';

export const handleCreatePO = async (req, res, next) => {
  try {
    // 1. Initial Structural Request Zod Validation Run
    const validationResult = createPOSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        // Formats Zod errors into a clean human-readable list
        details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      });
    }

    // 2. Extract Validated Payload Data
    const validatedData = validationResult.data;

    // 3. Extract Authenticated Principal Identity
    const userId = req.user?._id || req.body.mockUserId; 
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    // 4. Delegation downstream to Orchestration Service Layer
    const purchaseOrder = await poService.createPurchaseOrder(validatedData, userId);

    return res.status(201).json({
      success: true,
      message: 'Purchase order draft created successfully',
      data: purchaseOrder
    });
  } catch (err) {
    next(err); 
  }
};


export const handleGetPOs = async (req, res) => {
  try {
    const orders = await poService.getPurchaseOrders(req.query);
    return res.status(200).json({ success: true, data: orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const handleSubmitPO = async (req, res, next) => {
  try {
    const userId = req.user?._id; // Bound securely by your authentication middleware layer
    const updatedPO = await approvalService.submitPurchaseOrder(req.params.id, userId);
    return res.status(200).json({ success: true, message: 'PO submitted for review.', data: updatedPO });
  } catch (err) { next(err); }
};

export const handleStartPOReview = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const updatedPO = await approvalService.startPOServiceReview(req.params.id, userId);
    return res.status(200).json({ success: true, message: 'PO lifecycle shifted to review status.', data: updatedPO });
  } catch (err) { next(err); }
};

export const handleApprovePO = async (req, res, next) => {
  try {
    const parsed = poApprovalDecisionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.format() });

    const userId = req.user?._id;
    const userRole = req.user?.role; // e.g., 'purchasing_manager' derived from secure access token
    
    const updatedPO = await approvalService.approvePurchaseOrder(req.params.id, userId, userRole, parsed.data.comment);
    return res.status(200).json({ success: true, message: 'PO authorized and approved.', data: updatedPO });
  } catch (err) { next(err); }
};

export const handleRejectPO = async (req, res, next) => {
  try {
    const parsed = poRejectionDecisionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.format() });

    const userId = req.user?._id;
    const updatedPO = await approvalService.rejectPurchaseOrder(req.params.id, userId, parsed.data.comment);
    return res.status(200).json({ success: true, message: 'PO procurement commitment rejected.', data: updatedPO });
  } catch (err) { next(err); }
};

export const handleReviseRejectedPO = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const updatedPO = await approvalService.reviseRejectedPOToDraft(req.params.id, userId);
    return res.status(200).json({ success: true, message: 'PO unlocked and reverted to DRAFT.', data: updatedPO });
  } catch (err) { next(err); }
};

export const handleGetPOHistory = async (req, res, next) => {
  try {
    const records = await approvalService.getPOApprovalHistory(req.params.id);
    return res.status(200).json({ success: true, data: records });
  } catch (err) { next(err); }
};

export const handleSendPO = async (req, res) => {
  try {
    const updatedPO = await poService.sendPurchaseOrderToSupplier(req.params.id);
    return res.status(200).json({ success: true, data: updatedPO });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const handleCancelPO = async (req, res) => {
  try {
    const updatedPO = await poService.cancelPurchaseOrder(req.params.id);
    return res.status(200).json({ success: true, data: updatedPO });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const handleSendPOToSupplier = async (req, res, next) => {
  try {
    const userId = req.user?._id; // Extracted safely from active authentication token contexts
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const result = await communicationService.sendPurchaseOrderToSupplier(req.params.id, userId);

    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: 'Internal authorization valid, but outward supplier delivery transmission failed.',
        details: result.commRecord.failureReason,
        data: { currentPOStatus: result.currentPOStatus }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Purchase order document successfully finalized and sent to supplier channel.',
      data: {
        poStatus: result.currentPOStatus,
        communicationId: result.commRecord._id,
        versionSent: result.commRecord.documentVersion,
        messageTracker: result.commRecord.providerMessageId
      }
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetPOCommunications = async (req, res, next) => {
  try {
    const records = await communicationService.getPOCommunicationHistory(req.params.id);
    return res.status(200).json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

export const handleSupplierResponseSubmission = async (req, res, next) => {
  try {
    const parsedPayload = validation.supplierResponseSubmissionSchema.safeParse(req.body);
    if (!parsedPayload.success) {
      return res.status(400).json({ success: false, errors: parsedPayload.error.format() });
    }

    const executionUserId = req.user?._id;
    
    // Safety Layer: Extract supplier tracking metadata context from authenticated session profile
    // If incoming route is an automated external webhook API, bind req.supplier._id here
    const supplierId = req.supplier?._id || req.body.supplierId; 
    if (!supplierId) return res.status(400).json({ success: false, message: "Missing tracking supplier identification context profile." });

    const finalInputData = { ...parsedPayload.data, supplierId };

    const responseRecord = await service.processSupplierResponse(
      req.params.id, 
      finalInputData, 
      executionUserId
    );

    return res.status(201).json({
      success: true,
      message: 'Supplier transaction logging entry recorded successfully.',
      data: responseRecord
    });
  } catch (err) {
    next(err);
  }
};

export const handleInitializeReceipt = async (req, res, next) => {
  try {
    const parsedPayload = validation.createGoodsReceiptSchema.safeParse(req.body);
    if (!parsedPayload.success) {
      return res.status(400).json({ success: false, errors: parsedPayload.error.format() });
    }

    const executionUserId = req.user?._id;
    const trackingReceiptRecord = await service.initializeGoodsReceipt(parsedPayload.data, executionUserId);

    return res.status(201).json({
      success: true,
      message: 'Goods receipt tracking draft initial record captured successfully.',
      data: trackingReceiptRecord
    });
  } catch (err) { next(err); }
};

export const handleFinalizeReceiptInspection = async (req, res, next) => {
  try {
    const parsedPayload = validation.submitInspectionSchema.safeParse(req.body);
    if (!parsedPayload.success) {
      return res.status(400).json({ success: false, errors: parsedPayload.error.format() });
    }

    const executionUserId = req.user?._id;
    const lockedFinalizedReceipt = await service.postInspectionAndFinalizeReceipt(
      req.params.id,
      parsedPayload.data,
      executionUserId
    );

    return res.status(200).json({
      success: true,
      message: 'Quality inspections documented. Transaction ledger updates posted successfully.',
      data: lockedFinalizedReceipt
    });
  } catch (err) { next(err); }
};

export const handleRaiseDiscrepancy = async (req, res, next) => {
  try {
    const parsedPayload = validation.createDiscrepancySchema.safeParse(req.body);
    if (!parsedPayload.success) {
      return res.status(400).json({ success: false, errors: parsedPayload.error.format() });
    }

    const executionUserId = req.user?._id;
    const exceptionRecord = await service.captureReceivingDiscrepancy(
      req.params.receiptId, 
      parsedPayload.data, 
      executionUserId
    );

    return res.status(201).json({
      success: true,
      message: 'Receiving exception folder created and logged for audit tracking.',
      data: exceptionRecord
    });
  } catch (err) { next(err); }
};

export const handleProposeResolution = async (req, res, next) => {
  try {
    const parsedPayload = validation.proposeResolutionSchema.safeParse(req.body);
    if (!parsedPayload.success) {
      return res.status(400).json({ success: false, errors: parsedPayload.error.format() });
    }

    const executionUserId = req.user?._id;
    const resolutionRecord = await service.proposeCaseResolution(
      req.params.id,
      parsedPayload.data,
      executionUserId
    );

    return res.status(201).json({
      success: true,
      message: 'Resolution item proposal appended onto exception tracking history.',
      data: resolutionRecord
    });
  } catch (err) { next(err); }
};

export const handleRegisterInvoice = async (req, res, next) => {
  try {
    const parsedPayload = validation.createPurchaseInvoiceSchema.safeParse(req.body);
    if (!parsedPayload.success) {
      return res.status(400).json({ success: false, errors: parsedPayload.error.format() });
    }

    const executionUserId = req.user?._id;
    const recordedInvoice = await service.registerPurchaseInvoice(parsedPayload.data, executionUserId);

    return res.status(210).json({
      success: true,
      message: 'Supplier bill invoice filed. Three-Way matching audit completed.',
      data: recordedInvoice
    });
  } catch (err) { next(err); }
};

// /*
//  * Create Purchase Invoice Endpoint Handler (Page 2)
//  * Acts as the entry layer for parsing and structural validation routing.
//  * @param {Object} req - Incoming Express Request context
//  * @param {Object} res - Outgoing Express Response context
//  */
// export const handleCreatePurchaseInvoice = async (req, res) => {
//   try {
//     // 1. Initial Request Structural DTO Validation Check (Page 2)
//     const parsedPayload = validation.createPurchaseInvoiceSchema.safeParse(req.body);
//     if (!parsedPayload.success) {
//       return res.status(400).json({
//         success: false,
//         message: 'Purchase Invoice validation failed.',
//         errors: parsedPayload.error.format() // Formats error structures clearly for frontend consumption
//       });
//     }

//     // 2. Extract and Verify Authenticated User Context Identity (Page 2-3)
//     const executionUserId = req.user?._id || req.user?.id;
//     if (!executionUserId) {
//       return res.status(401).json({
//         success: false,
//         message: 'Authenticated user context is required.'
//       });
//     }

//     // 3. Delegate Clean Input Parameters Downward to Service Layer (Page 2, 9)
//     const invoice = await purchaseInvoiceService.createPurchaseInvoice(
//       parsedPayload.data,
//       executionUserId
//     );

//     // 4. Return Explicit 201 Document Persistent Success Response (Page 2-3)
//     return res.status(201).json({
//       success: true,
//       message: 'Purchase Invoice created successfully.',
//       data: {
//         _id: invoice._id,
//         invoiceNumber: invoice.invoiceNumber,
//         supplierInvoiceNumber: invoice.supplierInvoiceNumber,
//         matchingStatus: invoice.matchingStatus,   // Kept separate as 'NOT_STARTED' at setup (Page 8)
//         approvalStatus: invoice.approvalStatus,   // Initializing state vector mapping (Page 8)
//         paymentStatus: invoice.paymentStatus       // Initializing financial vector mapping (Page 8)
//       }
//     });

//   } catch (error) {
//     console.error('Create Purchase Invoice Error:', error);

//     // 5. Explicit Domain Error Mapping Gate (Page 6)
//     // Prevents masking specific functional failures under a blanket 500 code
//     const msg = error.message;
//     if (msg.includes('not found') || msg.includes('missing')) {
//       return res.status(404).json({ success: false, message: msg });
//     }
//     if (msg.includes('mismatch') || msg.includes('already exists') || msg.includes('duplicate')) {
//       return res.status(409).json({ success: false, message: msg });
//     }
//     if (msg.includes('INACTIVE') || msg.includes('not finalized')) {
//       return res.status(422).json({ success: false, message: msg });
//     }

//     // Fallback unexpected infrastructure catch-all (Page 6)
//     return res.status(500).json({
//       success: false,
//       message: msg || 'Failed to create Purchase Invoice.'
//     });
//   }
// };

/**
 * Phase 9.10.27 — Protected Purchase Invoice Creation Handler (Page 5)
 * Consumes pre-validated data to remove duplicate client body parsing.
 */
export const handleCreatePurchaseInvoice = async (req, res) => {
  try {
    // 1. Resolve User identity directly from the authenticated session token (Page 3)
    const executionUserId = req.user?._id || req.user?.id;
    if (!executionUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user context is required.'
      });
    }

    // 2. Delegate pre-parsed req.body directly down to the Service Layer (Page 5)
    // The validateRequest middleware ensures this payload matches createPurchaseInvoiceSchema
    const invoice = await purchaseInvoiceService.createPurchaseInvoice(
      req.body,
      executionUserId
    );

    // 3. Return a clean 201 Created status code for the newly tracked document (Page 3, 7)
    return res.status(201).json({
      success: true,
      message: 'Purchase Invoice created successfully.',
      data: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        supplierInvoiceNumber: invoice.supplierInvoiceNumber,
        status: invoice.status,           // Hardcoded server-side to 'DRAFT' (Page 7)
        matchingStatus: invoice.matchingStatus,   // Default: 'NOT_STARTED' (Page 7)
        approvalStatus: invoice.approvalStatus,   // Default: 'PENDING' (Page 7)
        paymentStatus: invoice.paymentStatus       // Default: 'UNPAID' (Page 7)
      }
    });

  } catch (error) {
    console.error('Create Purchase Invoice Error:', error);

    // 4. Map typed domain errors into matching client HTTP status codes (Page 6 of 9.10.26)
    const msg = error.message;
    if (msg.includes('not found') || msg.includes('missing')) {
      return res.status(404).json({ success: false, message: msg });
    }
    if (msg.includes('mismatch') || msg.includes('already exists')) {
      return res.status(409).json({ success: false, message: msg });
    }
    if (msg.includes('INACTIVE') || msg.includes('not finalized')) {
      return res.status(422).json({ success: false, message: msg });
    }

    return res.status(500).json({
      success: false,
      message: msg || 'Failed to create Purchase Invoice.'
    });
  }
};

/**
 * Three-Way Match Command Controller Trigger (Page 19)
 * Maps input path route elements and passes execution tracking IDs downstream.
 */
export const handleExecuteInvoiceMatching = async (req, res, next) => {
  try {
    const executionUserId = req.user?._id || req.user?.id;
    if (!executionUserId) {
      return res.status(401).json({ success: false, message: 'Authenticated user context is required.' });
    }

    // Invoke backend business service pipeline handler directly (Page 15)
    const outcome = await purchaseInvoiceService.processThreeWayInvoiceMatch(
      req.params.id,
      executionUserId
    );

    return res.status(200).json({
      success: true,
      message: `Invoice evaluation completed. Status locked: ${outcome.invoice.matchingStatus}.`,
      data: {
        invoiceNumber: outcome.invoice.invoiceNumber,
        matchingStatus: outcome.invoice.matchingStatus,
        matchingResult: outcome.invoice.matchingResult,
        approvalStatus: outcome.invoice.approvalStatus,
        analysisReport: outcome.auditReport
      }
    });
  } catch (error) {
    next(error); // Pass down into the server's global error router map block
  }
};


/**
 * Three-Way Matching Trigger Endpoint Handler (Page 3)
 * Operates as a thin command wrapper layer. Does not make business decisions itself.
 * @param {Object} req - Express Request Context
 * @param {Object} res - Express Response Context
 */
export const handleMatchPurchaseInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Initial Hex ObjectId Structure Sanity Check (Page 5)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Purchase Invoice ID.'
      });
    }

    // 2. Resolve Authenticated Execution User Trace Identity (Page 3, 5)
    const executionUserId = req.user?._id || req.user?.id;
    if (!executionUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user context is required.'
      });
    }

    // 3. Delegate execution directly downstream to processing service (Page 3, 6)
    // No request body data parsing is accepted or trusted to influence results (Page 17)
    const outcome = await purchaseInvoiceService.processThreeWayInvoiceMatch(
      id,
      executionUserId
    );

    // 4. Return explicit multi-dimensional decision state mapping (Page 3, 18)
    return res.status(200).json({
      success: true,
      message: 'Purchase Invoice matching completed successfully.',
      data: {
        invoiceId: outcome.invoice._id,
        invoiceNumber: outcome.invoice.invoiceNumber,
        matchingStatus: outcome.invoice.matchingStatus, // e.g., 'MATCHED', 'VARIANCE', 'BLOCKED' (Page 12)
        matchingResult: outcome.invoice.matchingResult, // Points to audit log references
        approvalStatus: outcome.invoice.approvalStatus, // Kept separate from matching states (Page 11)
        analysisReport: outcome.auditReport             // Exposes granular error breakdown tables (Page 18)
      }
    });

  } catch (error) {
    console.error('Match Purchase Invoice Error:', error);

    // Typed Domain Error mapping boundaries (Page 3, 7)
    const msg = error.message;
    if (msg.includes('not found') || msg.includes('missing')) {
      return res.status(404).json({ success: false, message: msg });
    }
    if (msg.includes('Process Locked') || msg.includes('already approved')) {
      return res.status(422).json({ success: false, message: msg });
    }

    return res.status(500).json({
      success: false,
      message: msg || 'Failed to match Purchase Invoice.'
    });
  }
};

// /**
//  * Purchase Invoice Approval Command Controller Trigger (Page 12)
//  * Maps input paths and security metadata directly down into your service execution layers.
//  */
// export const handleApprovePurchaseInvoice = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     // Validate structural incoming payload comment parameters
//     const parsedPayload = validation.purchaseInvoiceApprovalDecisionSchema.safeParse(req.body);
//     if (!parsedPayload.success) {
//       return res.status(400).json({ success: false, errors: parsedPayload.error.format() });
//     }

//     // Resolve context identities directly from backend token decoding layers
//     const executionUserId = req.user?._id || req.user?.id;
//     const userRole = req.user?.role; // e.g., 'purchasing_manager', 'department_manager'

//     if (!executionUserId || !userRole) {
//       return res.status(401).json({ success: false, message: 'Authenticated user role and context are required.' });
//     }

//     const updatedInvoice = await purchaseInvoiceService.approvePurchaseInvoice(
//       id,
//       executionUserId,
//       userRole,
//       parsedPayload.data
//     );

//     return res.status(200).json({
//       success: true,
//       message: 'Purchase Invoice financially authorized and approved successfully.',
//       data: {
//         invoiceNumber: updatedInvoice.invoiceNumber,
//         status: updatedInvoice.status,
//         approvalStatus: updatedInvoice.approvalStatus, // Transitioned cleanly to APPROVED (Page 13)
//         paymentStatus: updatedInvoice.paymentStatus     // Remains frozen at UNPAID (Page 13)
//       }
//     });

//   } catch (error) {
//     const msg = error.message;
//     if (msg.includes('Compliance Violation') || msg.includes('Authority Error')) {
//       return res.status(403).json({ success: false, message: msg }); // Enforce strict RBAC blocking
//     }
//     if (msg.includes('Procurement Blocked') || msg.includes('Process Invalid')) {
//       return res.status(422).json({ success: false, message: msg });
//     }
//     next(error);
//   }
// };

/**
 * Phase 9.10.31 — Purchase Invoice Approval Controller (Page 3)
 * Thin entry layer for parsing parameters and invoking domain operations.
 * @param {Object} req - Incoming Express Request Context
 * @param {Object} res - Outgoing Express Response Context
 */
export const handleApprovePurchaseInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    // 1. Initial Structural Hex ObjectId Sanity Check (Page 5)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Purchase Invoice ID.'
      });
    }

    // 2. Extract User Tracking Fields from Authenticated Session Token (Page 3)
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role; // e.g., 'purchasing_manager', 'department_manager'

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user context is required.'
      });
    }

    // 3. Delegate to Transactional Approval Service Operation (Page 3, 6)
    // Client cannot submit states directly; server evaluates authorization gates (Page 1)
    const invoice = await purchaseInvoiceService.approvePurchaseInvoice(
      id,
      userId,
      userRole,
      comment
    );

    // 4. Return Final Success Confirmation Payload (Page 3, 13)
    return res.status(200).json({
      success: true,
      message: 'Purchase Invoice approved successfully.',
      data: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,                 // Advanced cleanly to APPROVED (Page 13)
        approvalStatus: invoice.approvalStatus, // Synced confirmation state vector
        paymentStatus: invoice.paymentStatus     // Remains safely unmutated at UNPAID (Page 15)
      }
    });

  } catch (error) {
    console.error('Approve Purchase Invoice Error:', error);

    // 5. Map Typed Domain Exceptions to Accurate HTTP Response Codes (Page 3, 7, 13)
    const msg = error.message;
    if (msg.includes('not found') || msg.includes('missing')) {
      return res.status(404).json({ success: false, message: msg });
    }
    if (msg.includes('Compliance Violation') || msg.includes('Authority Error')) {
      return res.status(403).json({ success: false, message: msg }); // Strict RBAC Blocking (Page 13-14)
    }
    if (msg.includes('State Violation') || msg.includes('Procurement Blocked') || msg.includes('Process Invalid')) {
      return res.status(422).json({ success: false, message: msg }); // Invalid Transition Triggers
    }

    // Fallback unhandled infrastructure trace (Page 3)
    return res.status(500).json({
      success: false,
      message: msg || 'Failed to approve Purchase Invoice.'
    });
  }
};