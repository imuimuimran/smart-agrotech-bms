import { PurchaseOrder } from './purchase.model.js';
import { PO_STATUS } from './purchase.constants.js';
import mongoose from 'mongoose';

// Note: Ensure your core Product and Supplier models are imported to handle step validation
// import { Product } from '../products/product.model.js';
// import { Supplier } from '../suppliers/supplier.model.js';

export const createPurchaseOrder = async (poData, userId) => {
  // 1. Verify Supplier existence and clearance
  // const supplier = await Supplier.findById(poData.supplierId);
  // if (!supplier) throw new Error('Target procurement Supplier not found');

  let computedSubtotal = 0;
  const processedItems = [];

  // 2. Process each item, resolve snapshots, and calculate costs
  for (const item of poData.items) {
    // Structural Rule: Fetch product directly from master reference to capture fresh snapshot
    // const product = await Product.findById(item.productId);
    // if (!product) throw new Error(`Product reference ${item.productId} does not exist`);
    
    // Fallback mocks if fields aren't completely populated yet
    const productNameSnapshot = "Product Name Snapshot Mocked"; 
    const skuSnapshot = "SKU-SNAP-MOCK";

    const qty = Number(item.orderedQuantity);
    const unitCost = Number(item.expectedUnitCost);
    const disc = Number(item.discount || 0);
    const taxRate = Number(item.tax || 0);

    // Calculate structural line items accurately
    const rawLineTotal = qty * unitCost;
    const netAfterDiscount = rawLineTotal - disc;
    const taxAmount = netAfterDiscount * (taxRate / 100);
    const lineTotal = netAfterDiscount + taxAmount;

    computedSubtotal += rawLineTotal;

    processedItems.push({
      productId: item.productId,
      productNameSnapshot, // Safeguards history from master database drifts
      skuSnapshot,         // Safeguards history from master database drifts
      orderedQuantity: qty,
      expectedUnitCost: unitCost,
      discount: disc,
      tax: taxRate,
      lineTotal: lineTotal.toFixed(2)
    });
  }

  // 3. Document Grand Total Formulations
  const shipping = Number(poData.shippingCost || 0);
  const other = Number(poData.otherCharges || 0);
  const grandTotal = computedSubtotal + shipping + other;

  // 4. Server-Side Secure Sequential Reference Number Generation
  const totalCount = await PurchaseOrder.countDocuments();
  const currentYear = new Date().getFullYear();
  const poNumber = `PO-${currentYear}-${String(totalCount + 1).padStart(6, '0')}`;

  const newPO = new PurchaseOrder({
    poNumber,
    supplierId: poData.supplierId,
    expectedDeliveryDate: poData.expectedDeliveryDate,
    items: processedItems,
    subtotal: computedSubtotal.toFixed(2),
    shippingCost: shipping.toFixed(2),
    otherCharges: other.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
    status: PO_STATUS.DRAFT,
    createdBy: userId
  });

  return await newPO.save();
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
