// src/modules/purchases/purchase.service.js
import { PurchaseOrder } from './purchase.model.js';
import { PO_STATUS } from './purchase.constants.js';
import mongoose from 'mongoose';
import Counter from "../../shared/schemas/counter.model.js";
import { calculatePOTotals } from './purchase.utils.js';
import { Product } from '../products/product.model.js';
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

export const submitPurchaseOrder = async (poId, userId) => {
  const po = await PurchaseOrder.findById(poId);
  if (!po) throw new Error('Purchase Order not found');
  if (po.status !== PO_STATUS.DRAFT) throw new Error('Only DRAFT purchase orders can be submitted');

  po.status = PO_STATUS.SUBMITTED;
  po.submittedBy = userId;
  po.submittedAt = new Date();
  return await po.save();
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

export const sendPurchaseOrderToSupplier = async (poId) => {
  const po = await PurchaseOrder.findById(poId);
  if (!po) throw new Error('Purchase Order not found');
  if (po.status !== PO_STATUS.APPROVED) throw new Error('PO must be APPROVED before being sent to the supplier');

  po.status = PO_STATUS.SENT; // Matches SENT_TO_SUPPLIER structural state
  return await po.save();
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
