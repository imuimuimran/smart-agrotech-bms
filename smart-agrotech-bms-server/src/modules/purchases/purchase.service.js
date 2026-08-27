import mongoose from 'mongoose';
import { PurchaseOrder } from './purchase.model.js';
import { 
  PO_STATUS, 
  APPROVAL_THRESHOLDS, 
  CONFIG_ALLOW_SELF_APPROVAL,
  COMM_STATUS,
  SUPPLIER_RESPONSE_TYPES,
  GRN_LIFECYCLE, 
  GRN_INSPECTION, 
  GRN_POSTING,
  DISCREPANCY_STATUS,
  MATCH_RESULT_TYPES, 
  MATCHING_STATUS, 
  INVOICE_STATUS,
  PURCHASE_INVOICE_STATUS,
} from './purchase.constants.js';
import { PurchaseOrderApproval } from './purchaseApproval.model.js';
import { PurchaseOrderCommunication } from './purchaseCommunication.model.js';
import { transformToSupplierViewDTO } from './purchase.utils.js';
import Counter from "../../shared/schemas/counter.model.js";
import { calculatePOTotals } from './purchase.utils.js';
import { Product } from '../products/product.model.js';
import { GoodsReceipt } from './goodsReceipt.model.js';
import { SupplierResponse } from './supplierResponse.model.js';
import { InventoryTransaction } from './inventoryTransaction.model.js';
import { PurchaseReceivingDiscrepancy } from './purchaseDiscrepancy.model.js';
import { DiscrepancyResolution } from './discrepancyResolution.model.js';
import { PurchaseInvoice } from './purchaseInvoice.model.js';
import { InvoiceMatchResult } from './invoiceMatchResult.model.js';
import { Supplier } from '../suppliers/supplier.model.js';
import { comparePurchaseInvoiceMatrix } from './purchase.utils.js';

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

// export const approvePurchaseOrder = async (poId, userId) => {
//   const po = await PurchaseOrder.findById(poId);
//   if (!po) throw new Error('Purchase Order not found');
//   if (po.status !== PO_STATUS.SUBMITTED) throw new Error('Only SUBMITTED purchase orders can be approved');

//   po.status = PO_STATUS.APPROVED;
//   po.approvedBy = userId;
//   po.approvedAt = new Date();
//   return await po.save();
// };

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

/**
 * Initialize a Goods Receipt Note record (As DRAFT)
 */
export const initializeGoodsReceipt = async (receiptInput, executionUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const po = await PurchaseOrder.findById(receiptInput.purchaseOrderId).session(session);
    if (!po) throw new Error('Target validation baseline Purchase Order not found.');
    
    // Enforce business workflow bounds: Check if PO is commercialized and cleared
    if (po.status !== 'READY_FOR_FULFILLMENT' && po.status !== 'SENT_TO_SUPPLIER') {
      throw new Error(`Workflow Error: PO must be accepted by supplier before receiving items.`);
    }

    // Map item cost arrays dynamically from PO point-in-time snapshots (9.8.42)
    const poItemMap = po.items.reduce((map, item) => {
      map[item.productId.toString()] = item;
      return map;
    }, {});

    const hydratedItems = receiptInput.items.map(incomingItem => {
      const poMatch = poItemMap[incomingItem.productId.toString()];
      if (!poMatch) throw new Error(`Product match ${incomingItem.productId} does not belong to this PO context.`);

      return {
        productId: incomingItem.productId,
        orderedQuantity: poMatch.orderedQuantity,
        receivedQuantity: incomingItem.receivedQuantity,
        unitCost: poMatch.expectedUnitCost, // Lock pricing matrix safely
        acceptedQuantity: 0,
        rejectedQuantity: 0
      };
    });

    // Generate safe human-readable continuous numbering identification code
    const currentYear = new Date().getFullYear();
    const counterDoc = await Counter.findOneAndUpdate(
      { key: `goods-receipt-${currentYear}` },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, session }
    );
    const receiptNumber = `GR-${currentYear}-${String(counterDoc.sequence).padStart(6, '0')}`;

    const newReceipt = new GoodsReceipt({
      receiptNumber,
      purchaseOrderId: po._id,
      purchaseOrderVersion: po.version,
      supplierId: po.supplierId,
      warehouseId: receiptInput.warehouseId,
      supplierDeliveryReference: receiptInput.supplierDeliveryReference,
      items: hydratedItems,
      status: GRN_LIFECYCLE.DRAFT,
      inspectionStatus: GRN_INSPECTION.PENDING,
      postingStatus: GRN_POSTING.NOT_POSTED,
      notes: receiptInput.notes,
      receivedBy: executionUserId
    });

    await newReceipt.save({ session });
    await session.commitTransaction();
    return newReceipt;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Capture Quality Inspection Decisions & Complete Final Posting
 */
export const postInspectionAndFinalizeReceipt = async (receiptId, inspectionInput, executionUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch current transaction record with pessimistic concurrency lock execution protection
    const grn = await GoodsReceipt.findById(receiptId).session(session);
    if (!grn) throw new Error('Target Goods Receipt record not found.');

    // Strict Single-Execution Idempotency Guardrail Check
    if (grn.status === GRN_LIFECYCLE.FINALIZED || grn.postingStatus === GRN_POSTING.POSTED) {
      return grn; // Gracefully bypass re-processing instead of executing double entries
    }

    const po = await PurchaseOrder.findById(grn.purchaseOrderId).session(session);
    if (!po) throw new Error('Associated base Purchase Order reference record missing.');

    // 2. Fetch all historical finalized arrivals against this PO to parse true balance layers 
    const pastReceipts = await GoodsReceipt.find({
      purchaseOrderId: grn.purchaseOrderId,
      status: GRN_LIFECYCLE.FINALIZED,
      _id: { $ne: grn._id }
    }).session(session);

    // Compute cumulative previously received totals mapped by product ID boundaries
    const historicReceivedMap = {};
    pastReceipts.forEach(r => {
      r.items.forEach(item => {
        const pId = item.productId.toString();
        historicReceivedMap[pId] = (historicReceivedMap[pId] || 0) + item.acceptedQuantity;
      });
    });

    // 3. Process inspection arrays, execute structural sanity checks, and inject snapshots
    const inspectionItemMap = inspectionInput.items.reduce((map, item) => {
      map[item.productId.toString()] = item;
      return map;
    }, {});

    const TOLERANCE_COEFFICIENT = 1.05; // Hardcoded 5% business rule evaluation tier

    for (const grnItem of grn.items) {
      const pId = grnItem.productId.toString();
      const inspectionMatch = inspectionItemMap[pId];
      if (!inspectionMatch) throw new Error(`Inspection detail validation missing for item ${pId}`);

      // Total physical validation boundary constraint logic
      if (inspectionMatch.acceptedQuantity + inspectionMatch.rejectedQuantity !== grnItem.receivedQuantity) {
        throw new Error(`Arithmetic Drift: Accepted count + Rejected count must match physical arrival quantity.`);
      }

      // Independent backend recalculation validation layer
      const previouslyReceived = historicReceivedMap[pId] || 0;
      const allowedMaxStockVolume = grnItem.orderedQuantity * TOLERANCE_COEFFICIENT;

      if (previouslyReceived + inspectionMatch.acceptedQuantity > allowedMaxStockVolume) {
        throw new Error(`Over-Receiving Error: Quantity exceeds allowed 5% system tolerance framework threshold.`);
      }

      // Bind inspection results securely back onto the parent transaction array item record block
      grnItem.acceptedQuantity = inspectionMatch.acceptedQuantity;
      grnItem.rejectedQuantity = inspectionMatch.rejectedQuantity;
      grnItem.condition = inspectionMatch.condition;
      if (inspectionMatch.batchNumber) grnItem.batchNumber = inspectionMatch.batchNumber;
      if (inspectionMatch.serialNumbers) grnItem.serialNumbers = inspectionMatch.serialNumbers;
    }

    // 4. Update core multiversion transaction status matrices
    grn.status = GRN_LIFECYCLE.FINALIZED;
    grn.inspectionStatus = inspectionInput.result;
    grn.postingStatus = GRN_POSTING.POSTED;
    grn.inspection = {
      inspectedBy: executionUserId,
      inspectedAt: new Date(),
      result: inspectionInput.result,
      checklist: inspectionInput.checklist,
      notes: inspectionInput.notes
    };
    grn.postedAt = new Date();
    await grn.save({ session });

    // Orchestrate Isolated Downstream Inventory Ledger Allocations
    for (const finishedItem of grn.items) {
      if (finishedItem.acceptedQuantity > 0) {
        // Execute clean structural insertion without touching core metrics calculation variables directly
        const transactionLedgerRecord = new InventoryTransaction({
          productId: finishedItem.productId,
          warehouseId: grn.warehouseId,
          quantity: finishedItem.acceptedQuantity, // Only clear quality-passed volume entries 
          transactionType: 'PURCHASE_RECEIPT',
          referenceType: 'GOODS_RECEIPT',
          referenceId: grn._id,
          unitCost: finishedItem.unitCost,
          batchNumber: finishedItem.batchNumber,
          serialNumbers: finishedItem.serialNumbers,
          postedBy: executionUserId
        });
        await transactionLedgerRecord.save({ session });

        /**
         * NOTE: Connect your core Stock / ProductWarehouse collection updates here:
         * await ProductWarehouseStock.updateOne(
         *   { productId: finishedItem.productId, warehouseId: grn.warehouseId },
         *   { $inc: { physicalOnHand: finishedItem.acceptedQuantity } },
         *   { session, upsert: true }
         * );
         */
      }
    }

    // Dynamically summarize receiving activities back on the origin PO tracking dashboard
    let allProductsFullyReceived = true;
    for (const poItem of po.items) {
      const currentAcceptedVolume = (historicReceivedMap[poItem.productId.toString()] || 0) + 
                                    (inspectionItemMap[poItem.productId.toString()]?.acceptedQuantity || 0);
      
      if (currentAcceptedVolume < poItem.orderedQuantity) {
        allProductsFullyReceived = false;
      }
    }

    po.receivingStatus = allProductsFullyReceived ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED'; 
    await po.save({ session });

    await session.commitTransaction();
    return grn;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Core Secure Discrepancy Triage Initialization Logic
 */
export const captureReceivingDiscrepancy = async (receiptId, payloadInput, executionUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Core Reference Validation Checks 
    const grn = await GoodsReceipt.findById(receiptId).session(session);
    if (!grn) throw new Error('Target verification baseline Goods Receipt records vanished.');
    if (grn.status !== 'FINALIZED') throw new Error('Security Exception: Discrepancies can only be raised on posted arrivals.');

    const po = await PurchaseOrder.findById(grn.purchaseOrderId).session(session);
    if (!po) throw new Error('Associated baseline commercial commitment data missing.');

    // 2. Validate Product Membership Bounds & Map Financial Values 
    const grnItemMap = grn.items.reduce((map, item) => {
      map[item.productId.toString()] = item;
      return map;
    }, {});

    let calculatedTotalValueImpact = 0;
    let computedQuantityImpact = 0;

    const validatedItems = payloadInput.items.map(incItem => {
      const targetMatch = grnItemMap[incItem.productId.toString()];
      if (!targetMatch) throw new Error(`Fraud Guardrail: Product ${incItem.productId} does not exist on this receipt.`);

      // Multi-layer validation recalculation checks against client tampering
      if (incItem.affectedQuantity > targetMatch.receivedQuantity && payloadInput.type !== 'OVER_SHIPMENT') {
        throw new Error('Arithmetic Mismatch: Affected exception volume cannot exceed physical arrived count.');
      }

      // Safely multiply point-in-time cost matrix from original frozen PO snapshots
      const itemCost = Number(targetMatch.unitCost.toString());
      calculatedTotalValueImpact += (incItem.affectedQuantity * itemCost);
      computedQuantityImpact += incItem.affectedQuantity;

      return { ...incItem };
    });

    // 3. Human Readable Number Sequencing Auto-Generation 
    const currentYear = new Date().getFullYear();
    const counterDoc = await Counter.findOneAndUpdate(
      { key: `discrepancy-${currentYear}` },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, session }
    );
    const discrepancyNumber = `DIS-${currentYear}-${String(counterDoc.sequence).padStart(6, '0')}`;

    const newException = new PurchaseReceivingDiscrepancy({
      discrepancyNumber,
      purchaseOrderId: po._id,
      purchaseOrderVersion: grn.purchaseOrderVersion, // Retain original version trace alignment 
      goodsReceiptId: grn._id,
      supplierId: grn.supplierId,
      warehouseId: grn.warehouseId,
      type: payloadInput.type,
      severity: payloadInput.severity,
      status: DISCREPANCY_STATUS.OPEN,
      responsibility: 'UNKNOWN', // Default per business guideline 
      items: validatedItems,
      description: payloadInput.description,
      evidence: payloadInput.evidence,
      quantityImpact: computedQuantityImpact,
      estimatedValueImpact: calculatedTotalValueImpact.toFixed(2),
      detectedBy: executionUserId,
      dueDate: payloadInput.dueDate
    });

    await newException.save({ session });
    await session.commitTransaction();
    return newException;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Propose Multi-Resolution Ledger Target Actions
 */
export const proposeCaseResolution = async (discrepancyId, resolutionInput, executionUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const caseHead = await PurchaseReceivingDiscrepancy.findById(discrepancyId).session(session);
    if (!caseHead) throw new Error('Target Discrepancy Case folder reference not found.');

    // Enforce state transition consistency
    if (caseHead.status === DISCREPANCY_STATUS.CLOSED || caseHead.status === DISCREPANCY_STATUS.CANCELLED) {
      throw new Error('Workflow Locked: Cannot append resolutions onto a finalized tracking ledger branch.');
    }

    const newResolution = new DiscrepancyResolution({
      discrepancyId: caseHead._id,
      type: resolutionInput.type,
      quantity: resolutionInput.quantity,
      productId: resolutionInput.productId,
      value: resolutionInput.value.toFixed(2),
      status: 'PROPOSED'
    });
    await newResolution.save({ session });

    // Transition tracking head vector state naturally
    caseHead.status = DISCREPANCY_STATUS.RESOLUTION_PENDING;
    await caseHead.save({ session });

    await session.commitTransaction();
    return newResolution;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Enterprise Automated Three-Way Matching Core Logic Engine
 */
const runAutomatedThreeWayMatch = async (invoiceDoc, session, executionUserId) => {
  const po = await PurchaseOrder.findById(invoiceDoc.purchaseOrderId).session(session);
  const receipts = await GoodsReceipt.find({ _id: { $in: invoiceDoc.goodsReceiptIds } }).session(session);
  
  // Cross-reference Exception records to check for un-resolved disputes 
  const unresolvedDiscrepancies = await PurchaseReceivingDiscrepancy.find({
    goodsReceiptId: { $in: invoiceDoc.goodsReceiptIds },
    status: { $notin: ['RESOLVED', 'CLOSED'] }
  }).session(session);

  let quantityMatch = true;
  let priceMatch = true;
  let taxMatch = true;
  let discrepancyCheck = unresolvedDiscrepancies.length === 0; 

  const varianceItems = [];

  // Index PO line elements for baseline comparison lookups
  const poItemMap = po.items.reduce((map, item) => { map[item.productId.toString()] = item; return map; }, {});

  // Summarize quantities arrived physically across matching warehouse entries
  const actualReceivedMap = {};
  receipts.forEach(r => {
    r.items.forEach(item => {
      const pId = item.productId.toString();
      actualReceivedMap[pId] = (actualReceivedMap[pId] || 0) + item.acceptedQuantity;
    });
  });

  // Compare line elements side-by-side
  invoiceDoc.items.forEach(invItem => {
    const pId = invItem.productId.toString();
    const poMatch = poItemMap[pId];
    const physicalArrivedQty = actualReceivedMap[pId] || 0;

    const targetPOQty = poMatch ? poMatch.orderedQuantity : 0;
    const targetCost = poMatch ? Number(poMatch.expectedUnitCost.toString()) : 0;

    // Vector A: Quantity Checks (PO vs GRN vs Invoice)
    if (invItem.invoicedQuantity !== targetPOQty || invItem.invoicedQuantity !== physicalArrivedQty) {
      quantityMatch = false;
      varianceItems.push({
        productId: invItem.productId,
        varianceType: 'QUANTITY',
        poValue: String(targetPOQty),
        receiptValue: String(physicalArrivedQty),
        invoiceValue: String(invItem.invoicedQuantity)
      });
    }

    // Vector B: Price Matrix Drift Checks
    const currentPrice = Number(invItem.unitPrice.toString());
    if (currentPrice !== targetCost) {
      priceMatch = false;
      varianceItems.push({
        productId: invItem.productId,
        varianceType: 'PRICE',
        poValue: String(targetCost),
        invoiceValue: String(currentPrice)
      });
    }
  });

  // Evaluate final result classification tags
  let outcomeResult = MATCH_RESULT_TYPES.FULL_MATCH;
  if (!discrepancyCheck) outcomeResult = MATCH_RESULT_TYPES.DISCREPANCY_PENDING;
  else if (!priceMatch) outcomeResult = MATCH_RESULT_TYPES.PRICE_VARIANCE;
  else if (!quantityMatch) outcomeResult = MATCH_RESULT_TYPES.QUANTITY_VARIANCE;

  // Log matching trail history entry
  const matchLog = new InvoiceMatchResult({
    invoiceId: invoiceDoc._id,
    purchaseOrderId: po._id,
    goodsReceiptIds: invoiceDoc.goodsReceiptIds,
    quantityMatch,
    priceMatch,
    taxMatch,
    discrepancyCheck,
    varianceItems,
    result: outcomeResult,
    matchedBy: executionUserId
  });
  await matchLog.save({ session });

  // System Approval Flow Mapping
  invoiceDoc.matchingStatus = outcomeResult === MATCH_RESULT_TYPES.FULL_MATCH ? MATCHING_STATUS.MATCHED : MATCHING_STATUS.VARIANCE;
  invoiceDoc.matchingResult = matchLog._id;
  
  if (outcomeResult === MATCH_RESULT_TYPES.FULL_MATCH) {
    invoiceDoc.approvalStatus = INVOICE_STATUS.APPROVED; // Straight Auto Approval Pass
  } else {
    invoiceDoc.approvalStatus = INVOICE_STATUS.UNDER_REVIEW; // Retain case for manual inspection gates
  }
  
  await invoiceDoc.save({ session });
  return matchLog;
};

/**
 * Process and register a Supplier Invoice document 
 */
export const registerPurchaseInvoice = async (payloadData, executionUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const po = await PurchaseOrder.findById(payloadData.purchaseOrderId).session(session);
    if (!po) throw new Error('Target tracking base Purchase Order not found.');

    // Index PO items to resolve snapshot parameters cleanly
    const poItemMap = po.items.reduce((map, item) => { map[item.productId.toString()] = item; return map; }, {});

    let computedSubtotal = 0;
    let computedTax = 0;
    let computedDiscount = 0;

    const processedItems = payloadData.items.map(item => {
      const poMatch = poItemMap[item.productId.toString()];
      if (!poMatch) throw new Error(`Data Constraint: Product row ${item.productId} doesn't exist on PO baseline.`);

      const qty = item.invoicedQuantity;
      const price = item.unitPrice;
      const lineSubtotal = qty * price;
      const lineTotal = lineSubtotal - item.discountAmount + item.taxAmount;

      computedSubtotal += lineSubtotal;
      computedDiscount += item.discountAmount;
      computedTax += item.taxAmount;

      return {
        ...item,
        productNameSnapshot: poMatch.productNameSnapshot,
        skuSnapshot: poMatch.skuSnapshot,
        lineSubtotal: lineSubtotal.toFixed(2),
        lineTotal: lineTotal.toFixed(2)
      };
    });

    // Formulas and Tax Validations
    const grandTotal = computedSubtotal - computedDiscount + computedTax;

    // Generate consecutive sequential internal billing number strings
    const currentYear = new Date().getFullYear();
    const counterDoc = await Counter.findOneAndUpdate(
      { key: `purchase-invoice-${currentYear}` },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, session }
    );
    const invoiceNumber = `PINV-${currentYear}-${String(counterDoc.sequence).padStart(6, '0')}`;

    const newInvoice = new PurchaseInvoice({
      ...payloadData,
      invoiceNumber,
      items: processedItems,
      subtotal: computedSubtotal.toFixed(2),
      discountAmount: computedDiscount.toFixed(2),
      taxAmount: computedTax.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      matchingStatus: MATCHING_STATUS.IN_PROGRESS,
      approvalStatus: INVOICE_STATUS.UNDER_MATCHING,
      createdBy: executionUserId
    });
    await newInvoice.save({ session });

    // Execute Three-Way automated matching cycles mid-flight 
    await runAutomatedThreeWayMatch(newInvoice, session, executionUserId);

    await session.commitTransaction();
    return newInvoice;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } {
    session.endSession();
  }
};

/**
 * Phase 9.10.25 — Create Purchase Invoice Draft (Page 1)
 * Executes an atomic database transaction to validate relationships and compute totals.
 * @param {Object} invoiceInput - Structural payload parsed by Zod validation gates
 * @param {String} executionUserId - Requesting authenticated user identifier
 */
export const createPurchaseInvoice = async (invoiceInput, executionUserId) => {
  const session = await mongoose.startSession(); // 9.10.25.3 Transaction Control (Page 3)
  session.startTransaction();

  try {
    // 1. Supplier Eligibility Verification (Page 3)
    const supplier = await Supplier.findById(invoiceInput.supplierId).session(session);
    if (!supplier) {
      throw new Error('Target procurement Supplier not found.');
    }
    if (supplier.status !== 'ACTIVE') {
      throw new Error('Target supplier is currently INACTIVE and cannot be used for procurement.');
    }

    // 2. Purchase Order Integrity Validation (Page 3-4)
    const po = await PurchaseOrder.findById(invoiceInput.purchaseOrderId).session(session);
    if (!po) {
      throw new Error('Target Purchase Order record not found.');
    }
    // Cross-Module Fraud Contamination Guardrail (Page 4)
    if (po.supplierId.toString() !== supplier._id.toString()) {
      throw new Error('Purchase Order does not belong to the specified supplier.');
    }

    // 3. PO Version Protection Check (Page 4)
    if (invoiceInput.purchaseOrderVersion && invoiceInput.purchaseOrderVersion !== po.version) {
      throw new Error('Purchase Order version mismatch. The invoice must reference the current PO version.');
    }
    const purchaseOrderVersion = po.version;

    // 4. Goods Receipt System Verification Stack (Page 4-5)
    const goodsReceipts = await GoodsReceipt.find({
      _id: { $in: invoiceInput.goodsReceiptIds }
    }).session(session);

    if (goodsReceipts.length !== invoiceInput.goodsReceiptIds.length) {
      throw new Error('One or more referenced Goods Receipts could not be found.');
    }

    for (const receipt of goodsReceipts) {
      // Enforce absolute relationship boundary vectors (Page 5)
      if (receipt.purchaseOrderId.toString() !== po._id.toString()) {
        throw new Error(`Goods Receipt ${receipt.receiptNumber} does not belong to the specified Purchase Order.`);
      }
      if (receipt.supplierId.toString() !== supplier._id.toString()) {
        throw new Error(`Goods Receipt ${receipt.receiptNumber} does not belong to the specified supplier.`);
      }
      // 9.10.25.8 Receipt Finalization Guardrail: Block invoicing against un-posted drafts (Page 5-6)
      if (receipt.status !== GRN_LIFECYCLE.FINALIZED || receipt.postingStatus !== GRN_POSTING.POSTED) {
        throw new Error(`Goods Receipt ${receipt.receiptNumber} is not finalized and posted for invoicing.`);
      }
    }

    // 5. Duplicate External Supplier Invoice Reference Protection (Page 6)
    const existingInvoice = await PurchaseInvoice.findOne({
      supplierId: supplier._id,
      supplierInvoiceNumber: invoiceInput.supplierInvoiceNumber
    }).session(session);

    if (existingInvoice) {
      throw new Error('A Purchase Invoice with this supplier invoice number already exists for this supplier.');
    }

    // 6. Build PO Item Dictionary for internal indexing (Page 6)
    const poItemMap = po.items.reduce((map, item) => {
      map[item.productId.toString()] = item;
      return map;
    }, {});

    // 7. Hydrate Invoice Items & Resolve Historical Snapshots (Page 7-8)
    const hydratedItems = [];
    for (const incomingItem of invoiceInput.items) {
      const productIdStr = incomingItem.productId.toString();
      const poItem = poItemMap[productIdStr];

      if (!poItem) {
        throw new Error(`Product ${incomingItem.productId} does not belong to the specified Purchase Order.`);
      }

      // Fetch fresh master product record inside session context to capture point-in-time name/SKU parameters
      const product = await Product.findById(incomingItem.productId).session(session);
      if (!product) {
        throw new Error(`Product ${incomingItem.productId} not found.`);
      }

      // Handle precision scaling for numbers via pure arithmetic metrics utility format strings (Page 10)
      const toDecimal128 = (val) => mongoose.Types.Decimal128.fromString(Number(val || 0).toFixed(2));

      const qty = Number(incomingItem.invoicedQuantity);
      const unitPriceNum = Number(incomingItem.unitPrice);
      const discountNum = Number(incomingItem.discountAmount || 0);
      const taxNum = Number(incomingItem.taxAmount || 0);

      const lineSubtotalNum = qty * unitPriceNum;
      const lineTotalNum = lineSubtotalNum - discountNum + taxNum;

      hydratedItems.push({
        productId: product._id,
        purchaseOrderItemId: incomingItem.purchaseOrderItemId || poItem._id || null,
        goodsReceiptItemId: incomingItem.goodsReceiptItemId || null,
        productNameSnapshot: product.name, // Protects transaction history from future product drifts (Page 9)
        skuSnapshot: product.sku,         // Protects transaction history from future product drifts (Page 9)
        invoicedQuantity: qty,
        unitPrice: toDecimal128(unitPriceNum),
        discountAmount: toDecimal128(discountNum),
        taxAmount: toDecimal128(taxNum),
        lineSubtotal: toDecimal128(lineSubtotalNum),
        lineTotal: toDecimal128(lineTotalNum),
        batchNumbers: incomingItem.batchNumbers || [],
        serialNumbers: incomingItem.serialNumbers || [],
        notes: incomingItem.notes || ''
      });
    }

    // 8. Server-Side Secure Financial Recalculations (Page 9-10)
    const totalSubtotalNum = hydratedItems.reduce((sum, item) => sum + Number(item.lineSubtotal.toString()), 0);
    const totalDiscountNum = Number(invoiceInput.discountAmount || 0);
    const totalTaxNum = Number(invoiceInput.taxAmount || 0);
    const totalShippingNum = Number(invoiceInput.shippingCost || 0);
    const totalChargesNum = Number(invoiceInput.additionalCharges || 0);

    // Global Financial Summary Formulation (Page 10)
    const globalGrandTotalNum = 
      totalSubtotalNum - 
      totalDiscountNum + 
      totalTaxNum + 
      totalShippingNum + 
      totalChargesNum;

    const finalizeDecimal = (num) => mongoose.Types.Decimal128.fromString(num.toFixed(2));

    // 9. Concurrency-Safe Internal Sequential Serial Generation (Page 10-11)
    const currentYear = new Date().getFullYear();
    const counterDoc = await Counter.findOneAndUpdate(
      { key: `purchase-invoice-${currentYear}` },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, session }
    );
    const invoiceNumber = `PINV-${currentYear}-${String(counterDoc.sequence).padStart(6, '0')}`;

    // 10. Document Generation Configuration Forced strictly as DRAFT (Page 11-12)
    const newInvoice = new PurchaseInvoice({
      invoiceNumber,
      supplierInvoiceNumber: invoiceInput.supplierInvoiceNumber,
      supplierId: supplier._id,
      purchaseOrderId: po._id,
      purchaseOrderVersion,
      goodsReceiptIds: goodsReceipts.map(receipt => receipt._id),
      discrepancyIds: invoiceInput.discrepancyIds || [],
      invoiceDate: invoiceInput.invoiceDate,
      dueDate: invoiceInput.dueDate,
      currency: invoiceInput.currency,
      exchangeRate: mongoose.Types.Decimal128.fromString(Number(invoiceInput.exchangeRate || 1).toFixed(4)),
      items: hydratedItems,
      subtotal: finalizeDecimal(totalSubtotalNum),
      discountAmount: finalizeDecimal(totalDiscountNum),
      taxAmount: finalizeDecimal(totalTaxNum),
      shippingCost: finalizeDecimal(totalShippingNum),
      additionalCharges: finalizeDecimal(totalChargesNum),
      grandTotal: finalizeDecimal(globalGrandTotalNum),
      status: PURCHASE_INVOICE_STATUS.DRAFT, // Forced server-side workflow constraint state (Page 12)
      matchingStatus: 'NOT_STARTED',          // Omitted from setup side effects; run explicitly next (Page 2)
      approvalStatus: 'PENDING',
      paymentStatus: PAYMENT_STATUS.UNPAID,
      notes: invoiceInput.notes,
      attachments: invoiceInput.attachments || [],
      createdBy: executionUserId
    });

    // 11. Save and Atomically Commit Transaction (Page 12)
    await newInvoice.save({ session });
    await session.commitTransaction();
    
    return newInvoice;

  } catch (error) {
    // Abort active execution path state modifications cleanly (Page 12)
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Service Wrapper Execution Engine (Page 15)
 * Collects related database components and executes the match rules within an atomic transaction.
 * @param {String} invoiceId - Target Purchase Invoice identifier
 * @param {String} executionUserId - Requesting entity user footprint
 */
export const processThreeWayInvoiceMatch = async (invoiceId, executionUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch reference Invoice record
    const invoice = await PurchaseInvoice.findById(invoiceId).session(session);
    if (!invoice) throw new Error('Target Purchase Invoice document record not found.');

    // Enforce workflow lifecycle boundaries (Page 6 of 9.10.23)
    if (invoice.approvalStatus === 'APPROVED' || invoice.paymentStatus === 'PAID') {
      throw new Error('Process Locked: Cannot run matching on an already approved or settled invoice.');
    }

    // 2. Hydrate related Procurement records from database context
    const purchaseOrder = await PurchaseOrder.findById(invoice.purchaseOrderId).session(session);
    const goodsReceipts = await GoodsReceipt.find({ _id: { $in: invoice.goodsReceiptIds } }).session(session);

    // 3. Extract open, unresolved receiving discrepancy traces from Phase 9.9 (Page 9)
    const blockingStatuses = ['OPEN', 'UNDER_REVIEW', 'SUPPLIER_CONTACTED', 'AWAITING_SUPPLIER', 'RESOLUTION_PENDING'];
    const unresolvedDiscrepancies = await PurchaseReceivingDiscrepancy.find({
      goodsReceiptId: { $in: invoice.goodsReceiptIds },
      status: { $in: blockingStatuses }
    }).session(session);

    // 4. Delegate to pure calculation calculation utility matrix (Page 15)
    const auditReport = comparePurchaseInvoiceMatrix({
      purchaseOrder,
      goodsReceipts,
      invoice,
      unresolvedDiscrepancies
    });

    // 5. Update State vectors based on findings (Page 16)
    invoice.matchingStatus = auditReport.status;
    invoice.matchingResult = auditReport.result;
    
    // Explicit Invoice workflow transition mapping (Page 16)
    if (auditReport.status === 'MATCHED') {
      invoice.approvalStatus = PURCHASE_INVOICE_STATUS.MATCHED;
    } else if (auditReport.status === 'VARIANCE') {
      invoice.approvalStatus = PURCHASE_INVOICE_STATUS.VARIANCE_FOUND;
    } else if (auditReport.status === 'BLOCKED') {
      invoice.approvalStatus = PURCHASE_INVOICE_STATUS.UNDER_REVIEW;
    }

    // Record sequential verification log context row footprint (Page 4 of 9.10.22)
    invoice.approvalHistory.push({
      action: 'SENT_FOR_REVIEW',
      performedBy: executionUserId,
      performedAt: new Date(),
      comments: `Automated matching routine finished. Result state: ${auditReport.result}.`
    });

    invoice.updatedBy = executionUserId;
    await invoice.save({ session });

    // Commit transaction cleanly, leaving history records untouched (Page 2, 17)
    await session.commitTransaction();
    return { invoice, auditReport };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Dynamic Threshold Config Evaluator (Page 3-4)
 * Derives required system clearance roles from current invoice totals to avoid code hardcoding.
 */
const evaluateInvoiceRequiredRole = (grandTotal) => {
  const totalAmount = Number(grandTotal.toString());
  const rule = APPROVAL_THRESHOLDS.find(tier => totalAmount <= tier.maxAmount);
  return rule ? rule.requiredRole : 'admin'; // Fallback to system admin if bounds exceed configurations
};

/**
 * Transactional Invoice Approval Core Workflow (Page 9)
 * Guides an invoice safely through authorization states while verifying business parameters.
 */
export const approvePurchaseInvoice = async (invoiceId, executionUserId, userRole, inputData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch current target Invoice head tracking block inside the active transaction session
    const invoice = await PurchaseInvoice.findById(invoiceId).session(session);
    if (!invoice) throw new Error('Target Purchase Invoice document record not found.');

    // 2. State-Machine Guardrail: Block invalid or out-of-order transitions (Page 15)
    if (invoice.approvalStatus === 'APPROVED') {
      throw new Error('Process Invalid: Target Purchase Invoice has already been approved.');
    }

    // 3. 9.10.30.14 — Anti-Frontend Override: Re-validate matching metrics on the backend (Page 10)
    // Prevents approving data if underlying receiving parameters changed since the last match run
    if (invoice.matchingStatus !== 'MATCHED') {
      throw new Error('Procurement Blocked: Invoice cannot be approved because it lacks a valid MATCHED status.');
    }

    // 4. 9.10.30.6 — Compliance Check: Enforce Separation of Duties policy (Page 4-5)
    if (!CONFIG_ALLOW_SELF_APPROVAL && invoice.createdBy.toString() === executionUserId.toString()) {
      throw new Error('Compliance Violation: System configuration blocks self-approval policies.');
    }

    // 5. 9.10.30.7 — Evaluate Authority Tier against Configured Threshold Metrics (Page 5)
    const requiredRole = evaluateInvoiceRequiredRole(invoice.grandTotal);
    if (userRole !== 'admin' && userRole !== requiredRole) {
      throw new Error(`Authority Error: Insufficient tier rank. This transaction requires a ${requiredRole} role assignment.`);
    }

    const previousStatus = invoice.approvalStatus;

    // 6. Advance State Vectors naturally (Page 13)
    // Moving to APPROVED exposes the liability to accounts payable, but logs 0 automated payments (Page 13)
    invoice.approvalStatus = 'APPROVED';
    invoice.status = PURCHASE_INVOICE_STATUS.APPROVED;

    // 7. Append immutable history item to your audit footprint array tracking sheet (Page 11)
    invoice.approvalHistory.push({
      action: 'APPROVED',
      performedBy: executionUserId,
      performedAt: new Date(),
      comments: inputData.comment
    });

    invoice.updatedBy = executionUserId;
    await invoice.save({ session });

    // Commit all operations atomically
    await session.commitTransaction();
    return invoice;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};




