import mongoose from 'mongoose';
import { PurchaseOrder } from './purchase.model.js';
import { 
  PO_STATUS, 
  APPROVAL_THRESHOLDS, 
  CONFIG_ALLOW_SELF_APPROVAL,
  COMM_STATUS,
  SUPPLIER_RESPONSE_TYPES, 
} from './purchase.constants.js';
import { PurchaseOrderApproval } from './purchaseApproval.model.js';
import { PurchaseOrderCommunication } from './purchaseCommunication.model.js';
import { transformToSupplierViewDTO } from './purchase.utils.js';
import Counter from "../../shared/schemas/counter.model.js";
import { calculatePOTotals } from './purchase.utils.js';
import { Product } from '../products/product.model.js';
import { SupplierResponse } from './supplierResponse.model.js';
import { Supplier } from '../suppliers/supplier.model.js';

export const createPurchaseOrder = async (poInput, userId) => {
  const session = await mongoose.startSession(); // Phase 9.4.32 Transaction Control
  session.startTransaction();

  try {
    // 1. Supplier Eligibility Verification (Active Master Data Validation)
    const supplier = await Supplier.findById(poInput.supplierId).session(session);
    if (!supplier) {
      throw new Error('Target procurement Supplier not found');
    }
    if (supplier.status !== 'ACTIVE') {
      throw new Error('Target supplier is currently marked INACTIVE and cannot be used for procurement');
    }

    // 2. Scan and Detect Line Item Product Duplicates
    const productIds = poInput.items.map(i => i.productId);
    const uniqueIds = new Set(productIds);
    if (uniqueIds.size !== productIds.length) {
      throw new Error('Duplicate product items identified. Please combine item quantities into one line');
    }

    // 3. Optimize Lookups using a Single Query to Avoid N+1 Problems
    const products = await Product.find({ _id: { $in: productIds } }).session(session);
    if (products.length !== uniqueIds.size) {
      throw new Error('One or more selected products do not exist in master records');
    }

    // Map database results into an accessible lookup dictionary
    const productLookupMap = products.reduce((map, prod) => {
      map[prod._id.toString()] = prod;
      return map;
    }, {});

    // 4. Evaluate Product Eligibility and Enforce Lifecycle System Blocks
    for (const id of productIds) {
      const prod = productLookupMap[id];
      if (prod.status === 'ARCHIVED' || prod.status === 'DISCONTINUED') {
        throw new Error(`Product "${prod.name}" is archived or discontinued and cannot be purchased`);
      }
    }

    // 5. Centralized Financial Formulations via Utilities
    const financialReport = calculatePOTotals(poInput.items, poInput.shippingCost, poInput.otherCharges);

    // Inject Point-in-Time Master Data Snapshots into the final item tracking array
    const finalItems = financialReport.processedItems.map(item => {
      const dbProduct = productLookupMap[item.productId];
      return {
        ...item,
        productNameSnapshot: dbProduct.name, // Safeguards history from future master database drifts
        skuSnapshot: dbProduct.sku          // Safeguards history from future master database drifts
      };
    });

    // 6. Concurrency-Safe Generation of Sequenced Reference Identification
    const currentYear = new Date(poInput.orderDate).getFullYear();
    const counterKey = `purchase-order-${currentYear}`;
    
    const counterDoc = await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, session }
    );

    const poNumber = `PO-${currentYear}-${String(counterDoc.sequence).padStart(6, '0')}`;

    // 7. Initialize Document Payload strictly as DRAFT
    const newPurchaseOrder = new PurchaseOrder({
      poNumber,
      supplierId: poInput.supplierId,
      orderDate: poInput.orderDate,
      expectedDeliveryDate: poInput.expectedDeliveryDate,
      items: finalItems,
      subtotal: financialReport.subtotal,
      shippingCost: financialReport.shippingCost,
      otherCharges: financialReport.otherCharges,
      grandTotal: financialReport.grandTotal,
      status: PO_STATUS.DRAFT, // Hardcoded protection against client-side parameter manipulation
      notes: poInput.notes,
      createdBy: userId // Derived from active authorization credentials
    });

    const savedPO = await newPurchaseOrder.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    return savedPO;

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Dynamic Threshold Evaluator
 * Derives authority rules directly from current financial total values.
 */
const evaluateRequiredRole = (grandTotal) => {
  const amount = Number(grandTotal.toString());
  const rule = APPROVAL_THRESHOLDS.find(tier => amount <= tier.maxAmount);
  return rule ? rule.requiredRole : 'admin';
};

/**
 * Mid-flight Master Reference Verification Guardrail
 * Ensures suppliers or products didn't shift states during draft/review delays.
 */
const runMidFlightSanityRecheck = async (po, session) => {
  const supplier = await Supplier.findById(po.supplierId).session(session);
  if (!supplier || supplier.status !== 'ACTIVE') {
    throw new Error('Procurement Blocked: The designated Supplier is no longer active.');
  }

  const productIds = po.items.map(item => item.productId);
  const products = await Product.find({ _id: { $in: productIds } }).session(session);
  
  if (products.length !== productIds.length) {
    throw new Error('Procurement Blocked: One or more products inside this PO have been deleted.');
  }

  for (const prod of products) {
    if (prod.status === 'ARCHIVED' || prod.status === 'DISCONTINUED') {
      throw new Error(`Procurement Blocked: Product "${prod.name}" is discontinued or archived.`);
    }
  }
};

// =========================================================================
// STATE TRANSACTION METHODS
// =========================================================================

export const submitPurchaseOrder = async (poId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) throw new Error('Target Purchase Order record not found.');
    if (po.status !== PO_STATUS.DRAFT) throw new Error('State Violation: Only DRAFT POs can be submitted.');

    // 9.5.5 Execute complete validation stack again prior to leaving DRAFT phase
    await runMidFlightSanityRecheck(po, session);

    const oldStatus = po.status;
    po.status = PO_STATUS.SUBMITTED;
    await po.save({ session });

    await PurchaseOrderApproval.create([{
      purchaseOrderId: po._id,
      action: 'SUBMIT',
      performedBy: userId,
      previousStatus: oldStatus,
      newStatus: PO_STATUS.SUBMITTED,
      comment: 'Submitted for managerial review.'
    }], { session });

    await session.commitTransaction();
    return po;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const startPOServiceReview = async (poId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) throw new Error('Target Purchase Order record not found.');
    if (po.status !== PO_STATUS.SUBMITTED) throw new Error('State Violation: Review requires a SUBMITTED state.');

    const oldStatus = po.status;
    po.status = PO_STATUS.UNDER_REVIEW;
    await po.save({ session });

    await PurchaseOrderApproval.create([{
      purchaseOrderId: po._id,
      action: 'START_REVIEW',
      performedBy: userId,
      previousStatus: oldStatus,
      newStatus: PO_STATUS.UNDER_REVIEW,
      comment: 'Review session initiated.'
    }], { session });

    await session.commitTransaction();
    return po;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const approvePurchaseOrder = async (poId, userId, userRole, comment) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) throw new Error('Target Purchase Order record not found.');
    if (po.status !== PO_STATUS.UNDER_REVIEW) throw new Error('State Violation: PO must be UNDER_REVIEW.');

    // Enforce separation of duties configuration checks
    if (!CONFIG_ALLOW_SELF_APPROVAL && po.createdBy.toString() === userId.toString()) {
      throw new Error('Compliance Violation: System configuration blocks self-approval policies.');
    }

    // Dynamically compute requirement rules from current amount criteria
    const requiredRole = evaluateRequiredRole(po.grandTotal);
    if (userRole !== 'admin' && userRole !== requiredRole) {
      throw new Error(`Authority Error: Insufficient tier rank. This requires a ${requiredRole} role assignment.`);
    }

    // Final sanity check step right before committing status update
    await runMidFlightSanityRecheck(po, session);

    const oldStatus = po.status;
    po.status = PO_STATUS.APPROVED;
    await po.save({ session });

    await PurchaseOrderApproval.create([{
      purchaseOrderId: po._id,
      action: 'APPROVE',
      performedBy: userId,
      previousStatus: oldStatus,
      newStatus: PO_STATUS.APPROVED,
      approvalLevel: requiredRole.toUpperCase(),
      comment: comment || 'Approved for procurement dispatch.'
    }], { session });

    await session.commitTransaction();
    return po;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const rejectPurchaseOrder = async (poId, userId, comment) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) throw new Error('Target Purchase Order record not found.');
    if (po.status !== PO_STATUS.UNDER_REVIEW) throw new Error('State Violation: Only POs UNDER_REVIEW can be rejected.');

    const oldStatus = po.status;
    po.status = PO_STATUS.REJECTED;
    await po.save({ session });

    await PurchaseOrderApproval.create([{
      purchaseOrderId: po._id,
      action: 'REJECT',
      performedBy: userId,
      previousStatus: oldStatus,
      newStatus: PO_STATUS.REJECTED,
      comment: comment // Assured present by earlier Zod validation steps
    }], { session });

    await session.commitTransaction();
    return po;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const reviseRejectedPOToDraft = async (poId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) throw new Error('Target Purchase Order record not found.');
    if (po.status !== PO_STATUS.REJECTED) throw new Error('State Violation: Only REJECTED POs can be reset.');

    const oldStatus = po.status;
    po.status = PO_STATUS.DRAFT;
    await po.save({ session });

    await PurchaseOrderApproval.create([{
      purchaseOrderId: po._id,
      action: 'REVISE',
      performedBy: userId,
      previousStatus: oldStatus,
      newStatus: PO_STATUS.DRAFT,
      comment: 'Returned to draft state for adjustment.'
    }], { session });

    await session.commitTransaction();
    return po;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getPOApprovalHistory = async (poId) => {
  return await PurchaseOrderApproval.find({ purchaseOrderId: poId })
    .populate('performedBy', 'name email role')
    .sort({ performedAt: 1 });
};

export const approvePurchaseOrder = async (poId, userId) => {
  const po = await PurchaseOrder.findById(poId);
  if (!po) throw new Error('Purchase Order not found');
  if (po.status !== PO_STATUS.SUBMITTED) throw new Error('Only SUBMITTED purchase orders can be approved');

  po.status = PO_STATUS.APPROVED;
  po.approvedBy = userId;
  po.approvedAt = new Date();
  return await po.save();
};

/**
 * Complete Procurement Dispatch Workflow
 */
export const sendPurchaseOrderToSupplier = async (poId, userId) => {
  // 1. Fetch Purchase Order document
  const po = await PurchaseOrder.findById(poId);
  if (!po) throw new Error('Target Purchase Order record not found.');

  // 2. Strict State Constraint Verification
  if (po.status !== PO_STATUS.APPROVED && po.status !== PO_STATUS.SENT_TO_SUPPLIER) {
    throw new Error(`State Violation: Purchase Order cannot be transmitted while flagged as ${po.status}.`);
  }

  // 3. Active Idempotency Guardrail
  const activeJob = await PurchaseOrderCommunication.findOne({
    purchaseOrderId: poId,
    status: COMM_STATUS.SENDING
  });
  if (activeJob) throw new Error('Duplicate Send Blocked: A dispatch operation is currently actively processing.');

  // 4. Resolve Master Supplier Destination Parameters
  const supplier = await Supplier.findById(po.supplierId);
  if (!supplier) throw new Error('Primary reference Supplier not found.');

  // 5. Core Procurement Communication Data Guards
  const targetEmail = supplier.email; // Map clear, explicit channel references here
  if (!targetEmail || !/^\S+@\S+\.\S+$/.test(targetEmail)) {
    throw new Error('Contact Mapping Error: Selected supplier lacks a valid procurement destination email.');
  }

  // 6. Generate Security Isolated Supplier Data View Payload
  const supplierFacingDocumentData = transformToSupplierViewDTO(po, supplier);

  // 7. Calculate running execution document version
  const previousDispatchesCount = await PurchaseOrderCommunication.countDocuments({ purchaseOrderId: poId });
  const docVersion = previousDispatchesCount + 1; // 9.6.13 Multi-version increment tracker

  // 8. Log initial Pending tracking entry
  const commRecord = new PurchaseOrderCommunication({
    purchaseOrderId: po._id,
    documentVersion: docVersion,
    channel: 'EMAIL',
    recipient: targetEmail,
    subject: `Purchase Order ${po.poNumber} — Procurement Order Shipment Documentation`,
    status: COMM_STATUS.SENDING,
    initiatedBy: userId
  });
  await commRecord.save();

  try {
    /**
     * Document Presentation and Delivery Phase
     * Mock integration placeholder for your SMTP / SendGrid / NodeMailer adapter pipeline.
     * In an enterprise setup, push this payload to a Redis background Queue Worker.
     */
    const transmissionMockSuccess = true; // Simulating email provider payload handoff
    const mockProviderMessageId = `msg_smtp_${Math.random().toString(36).substring(7)}`;

    if (!transmissionMockSuccess) throw new Error('Third-party provider dropped connection socket.');

    // Successful Dispatch Pipeline Processing Routine
    commRecord.status = COMM_STATUS.SENT;
    commRecord.providerMessageId = mockProviderMessageId;
    commRecord.sentAt = new Date();
    await commRecord.save();

    // Secure state transition rule mapping: Advance parent reference code safely
    po.status = PO_STATUS.SENT_TO_SUPPLIER;
    await po.save();

    return { success: true, commRecord, currentPOStatus: po.status };

  } catch (deliveryError) {
    // Fallback isolated recovery procedures
    commRecord.status = COMM_STATUS.FAILED;
    commRecord.failureReason = deliveryError.message || 'Unknown network gateway connection drop.';
    commRecord.failedAt = new Date();
    await commRecord.save();

    // Note: Parent document purposefully stays locked at APPROVED status so users can retry manually
    return { success: false, commRecord, currentPOStatus: po.status, error: deliveryError.message };
  }
};

export const getPOCommunicationHistory = async (poId) => {
  return await PurchaseOrderCommunication.find({ purchaseOrderId: poId })
    .populate('initiatedBy', 'name email role')
    .sort({ createdAt: -1 }); // Display newest transaction attempts first
};


export const cancelPurchaseOrder = async (poId) => {
  const po = await PurchaseOrder.findById(poId);
  if (!po) throw new Error('Purchase Order not found');

  const genericCancellableStates = [PO_STATUS.DRAFT, PO_STATUS.SUBMITTED, PO_STATUS.APPROVED, PO_STATUS.SENT];
  if (!genericCancellableStates.includes(po.status)) {
    throw new Error('Cannot cancel a purchase order once warehouse receiving workflows have started');
  }

  po.status = PO_STATUS.CANCELLED;
  return await po.save();
};

export const getPurchaseOrders = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.supplierId) query.supplierId = filters.supplierId;
  if (filters.poNumber) query.poNumber = { $regex: filters.poNumber, $options: 'i' };
  
  return await PurchaseOrder.find(query)
    .populate('supplierId', 'name email')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
};

export const processSupplierResponse = async (poId, inputData, executionUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch current target Purchase Order tracking head
    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) throw new Error('Target Purchase Order record not found.');

    // Cross-Supplier Fraud Contamination Guardrail
    if (po.supplierId.toString() !== inputData.supplierId.toString()) {
      throw new Error('Security Violation: Access Denied. Authenticated supplier context mismatch.');
    }

    // Strict Idempotency Check Layer
    if (inputData.idempotencyKey) {
      const duplicateCheck = await SupplierResponse.findOne({ 
        idempotencyKey: inputData.idempotencyKey 
      }).session(session);
      if (duplicateCheck) return duplicateCheck; // Gracefully bypass re-processing
    }

    // 4. Build detached transaction ledger document instance
    const newResponse = new SupplierResponse({
      purchaseOrderId: po._id,
      purchaseOrderVersion: po.version, // Capture active version pointer snapshot
      supplierId: po.supplierId,
      responseType: inputData.responseType,
      supplierReference: inputData.supplierReference,
      responseChannel: inputData.responseChannel,
      message: inputData.message,
      items: inputData.items || [],
      requestedChanges: inputData.requestedChanges || [],
      idempotencyKey: inputData.idempotencyKey,
      receivedAt: inputData.receivedAt,
      recordedBy: executionUserId
    });
    await newResponse.save({ session });

    // Core Operational State Rules Engine Matrix
    po.supplierResponseStatus = inputData.responseType; // Update dimension reference index

    if (inputData.responseType === SUPPLIER_RESPONSE_TYPES.ACCEPTED) {
      // Direct pass allowed safely toward receiving workflows
      po.status = PO_STATUS.READY_FOR_FULFILLMENT; // No stocks are changed yet
    } else {
      // Blocks modifications from directly altering core parameters
      // Retain baseline parameters. Force human decision review gates.
      po.status = PO_STATUS.UNDER_REVIEW; 
    }

    await po.save({ session });
    await session.commitTransaction();
    return newResponse;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Controlled Amendment Version Revision Branching Execution
 * Generates an isolated next-generation DRAFT copy of a PO if changes are approved internally.
 */
export const executePOAmendmentBranching = async (poId, adjustedItems, adjustedTotals, executionUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parentPO = await PurchaseOrder.findById(poId).session(session);
    if (!parentPO) throw new Error('Base document reference target vanished.');

    // Freeze original transaction details into an immutable configuration state
    const nextVersionNumber = parentPO.version + 1;

    // Build independent child document clone tracking node
    const baseClonePayload = parentPO.toObject();
    delete baseClonePayload._id;
    delete baseClonePayload.createdAt;
    delete baseClonePayload.updatedAt;

    const amendedPO = new PurchaseOrder({
      ...baseClonePayload,
      poNumber: parentPO.poNumber, // Inherit continuous business track identity
      version: nextVersionNumber,  // Increment numerical version pointer branch
      items: adjustedItems,        // Inject company-reviewed pricing/quantity elements
      ...adjustedTotals,           // Re-calculate financial thresholds server-side
      status: PO_STATUS.DRAFT,     // Forces reapproval from scratch
      supplierResponseStatus: undefined,
      createdBy: executionUserId
    });

    await amendedPO.save({ session });
    await session.commitTransaction();
    return amendedPO;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};


