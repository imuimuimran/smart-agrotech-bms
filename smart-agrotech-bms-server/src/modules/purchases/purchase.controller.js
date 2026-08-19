import * as poService from './purchase.service.js';
import * as approvalService from './purchase.service.js';
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
