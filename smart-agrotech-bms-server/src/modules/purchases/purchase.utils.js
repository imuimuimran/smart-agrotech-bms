/**
 * Centralized Financial Calculation Utility
 * Prevents arithmetic drift by controlling precision server-side.
 */
export const calculatePOTotals = (items, shippingCost = 0, otherCharges = 0) => {
  let subtotal = 0;

  const processedItems = items.map(item => {
    const qty = Number(item.orderedQuantity || item.quantity);
    const cost = Number(item.expectedUnitCost);
    const disc = Number(item.discount || 0);
    const taxRate = Number(item.tax || 0);

    const rawLineTotal = qty * cost;
    const netAfterDiscount = rawLineTotal - disc;
    const taxAmount = netAfterDiscount * (taxRate / 100);
    const lineTotal = netAfterDiscount + taxAmount;

    subtotal += rawLineTotal;

    return {
      productId: item.productId,
      orderedQuantity: qty,
      expectedUnitCost: cost.toFixed(2),
      discount: disc.toFixed(2),
      tax: taxRate,
      lineTotal: lineTotal.toFixed(2)
    };
  });

  const shipping = Number(shippingCost);
  const other = Number(otherCharges);
  const grandTotal = subtotal + shipping + other;

  return {
    processedItems,
    subtotal: subtotal.toFixed(2),
    shippingCost: shipping.toFixed(2),
    otherCharges: other.toFixed(2),
    grandTotal: grandTotal.toFixed(2)
  };
};

/**
 * Supplier Procurement DTO View Model
 * Isolates sensitive database attributes from external document presentations.
 */
export const transformToSupplierViewDTO = (purchaseOrder, supplier) => {
  if (!purchaseOrder || !supplier) {
    throw new Error('Data mapping dependencies missing initialization configurations.');
  }

  return {
    poNumber: purchaseOrder.poNumber,
    date: purchaseOrder.createdAt,
    expectedDelivery: purchaseOrder.expectedDeliveryDate,
    supplier: {
      name: supplier.name,
      address: supplier.address || 'N/A',
      email: supplier.email
    },
    items: purchaseOrder.items.map(item => ({
      productName: item.productNameSnapshot, // Point-in-time immutable record
      sku: item.skuSnapshot,                 // Point-in-time immutable record
      quantity: item.orderedQuantity,
      unitCost: item.expectedUnitCost.toString(),
      discount: item.discount.toString(),
      tax: item.tax.toString(),
      lineTotal: item.lineTotal.toString()
    })),
    financialSummary: {
      subtotal: purchaseOrder.subtotal.toString(),
      tax: purchaseOrder.tax ? purchaseOrder.tax.toString() : '0.00',
      shippingCost: purchaseOrder.shippingCost.toString(),
      otherCharges: purchaseOrder.otherCharges.toString(),
      grandTotal: purchaseOrder.grandTotal.toString()
    },
    notes: purchaseOrder.notes || ''
  };
};

/**
 * Anti-Drift Money Formulation Engine (Page 6)
 * Avoids native JS binary floats to guarantee cents-level precision.
 * Expects numbers or string digits, output values format back into high-precision strings.
 */
export const calculatePurchaseInvoiceTotals = ({
  items,
  discountAmount = 0,
  taxAmount = 0,
  shippingCost = 0,
  additionalCharges = 0
}) => {
  // Helper to safely convert incoming parameters to an integer (Cents scaling)
  const toCents = (val) => Math.round((Number(val || 0) + Number.EPSILON) * 100);
  const fromCents = (cents) => (cents / 100).toFixed(2);

  let calculatedSubtotalCents = 0;

  // Process item line segments row-by-row
  const calculatedItems = items.map(item => {
    const qty = Number(item.invoicedQuantity || 0);
    const unitPriceCents = toCents(item.unitPrice);
    const itemDiscountCents = toCents(item.discountAmount);
    const itemTaxCents = toCents(item.taxAmount);

    const lineSubtotalCents = qty * unitPriceCents;
    const lineTotalCents = lineSubtotalCents - itemDiscountCents + itemTaxCents;

    calculatedSubtotalCents += lineSubtotalCents;

    return {
      productId: item.productId,
      purchaseOrderItemId: item.purchaseOrderItemId,
      goodsReceiptItemId: item.goodsReceiptItemId,
      invoicedQuantity: qty,
      unitPrice: fromCents(unitPriceCents),
      discountAmount: fromCents(itemDiscountCents),
      taxAmount: fromCents(itemTaxCents),
      lineSubtotal: fromCents(lineSubtotalCents),
      lineTotal: fromCents(lineTotalCents)
    };
  });

  // Scale operational header elements into absolute cents integers
  const globalDiscountCents = toCents(discountAmount);
  const globalTaxCents = toCents(taxAmount);
  const globalShippingCents = toCents(shippingCost);
  const globalChargesCents = toCents(additionalCharges);

  // Financial Grand Total Equation (Page 6)
  const grandTotalCents = 
    calculatedSubtotalCents - 
    globalDiscountCents + 
    globalTaxCents + 
    globalShippingCents + 
    globalChargesCents;

  return {
    items: calculatedItems,
    subtotal: fromCents(calculatedSubtotalCents),
    discountAmount: fromCents(globalDiscountCents),
    taxAmount: fromCents(globalTaxCents),
    shippingCost: fromCents(globalShippingCents),
    additionalCharges: fromCents(globalChargesCents),
    grandTotal: fromCents(grandTotalCents)
  };
};

/**
 * 3-Way Blueprint Evaluation Evaluator Outline (Page 7-8)
 * Checks parameters without running destructive mutative changes.
 */
export const previewThreeWayMatchMatrix = ({
  orderedQty,
  receivedQty,
  invoicedQty,
  orderedPrice,
  invoicedPrice,
  hasOpenDiscrepancies = false
}) => {
  const qtyMatched = (orderedQty === receivedQty) && (receivedQty === invoicedQty);
  const priceMatched = Number(orderedPrice) === Number(invoicedPrice);
  const clearOfDiscrepancies = !hasOpenDiscrepancies; // Page 8 Rule

  let status = 'MATCHED';
  let result = 'FULL_MATCH';
  const variances = [];

  if (hasOpenDiscrepancies) {
    status = 'BLOCKED';
    result = 'DISCREPANCY_PENDING';
    variances.push('DISCREPANCY');
  } else if (!priceMatched) {
    status = 'VARIANCE';
    result = 'PRICE_VARIANCE';
    variances.push('PRICE');
  } else if (!qtyMatched) {
    status = 'VARIANCE';
    result = 'QUANTITY_VARIANCE';
    variances.push('QUANTITY');
  }

  return { status, result, variances };
};

/**
 * Pure Three-Way Matching Calculation Engine (Page 15)
 * Compares data points across lines without running side effects or mutations.
 */
export const comparePurchaseInvoiceMatrix = ({
  purchaseOrder,
  goodsReceipts,
  invoice,
  unresolvedDiscrepancies = []
}) => {
  // 1. Initialize Product Map Trackers (Page 3-4)
  const poQtyMap = new Map();
  const poPriceMap = new Map();
  purchaseOrder.items.forEach(item => {
    const pId = item.productId.toString();
    poQtyMap.set(pId, (poQtyMap.get(pId) || 0) + item.orderedQuantity);
    poPriceMap.set(pId, Number(item.expectedUnitCost.toString())); // Baseline unit cost reference
  });

  // 2. Aggregate Accepted Goods Receipt Quantities (Page 3-4)
  const acceptedQtyMap = new Map();
  goodsReceipts.forEach(receipt => {
    receipt.items.forEach(item => {
      const pId = item.productId.toString();
      acceptedQtyMap.set(pId, (acceptedQtyMap.get(pId) || 0) + item.acceptedQuantity); // Use accepted volume (Page 3)
    });
  });

  // 3. Map Supplier Invoiced Quantities (Page 4)
  const invoiceQtyMap = new Map();
  const invoicePriceMap = new Map();
  invoice.items.forEach(item => {
    const pId = item.productId.toString();
    invoiceQtyMap.set(pId, (invoiceQtyMap.get(pId) || 0) + item.invoicedQuantity);
    invoicePriceMap.set(pId, Number(item.unitPrice.toString()));
  });

  // Collect a unique set of all Product IDs present across documents (Page 5)
  const allProductIds = new Set([
    ...poQtyMap.keys(),
    ...acceptedQtyMap.keys(),
    ...invoiceQtyMap.keys()
  ]);

  let quantityMatched = true;
  let priceMatched = true;
  const quantityVariances = [];
  const priceVariances = [];

  // 4. Run Product-Level Quantitative Audits (Page 2, 5)
  allProductIds.forEach(pId => {
    const ordered = poQtyMap.get(pId) || 0;
    const accepted = acceptedQtyMap.get(pId) || 0;
    const invoiced = invoiceQtyMap.get(pId) || 0;
    const poPrice = poPriceMap.get(pId) || 0;
    const invPrice = invoicePriceMap.get(pId) || 0;

    // Check quantity alignments (Page 5)
    if (invoiced !== ordered || invoiced !== accepted) {
      quantityMatched = false;
      quantityVariances.push({
        productId: pId,
        ordered,
        accepted,
        invoiced,
        variance: invoiced - accepted,
        type: invoiced > accepted ? 'OVER_INVOICED' : 'UNDER_INVOICED'
      });
    }

    // Check pricing parameters (Page 6)
    if (invoiced > 0 && invPrice !== poPrice) {
      priceMatched = false;
      priceVariances.push({
        productId: pId,
        poPrice,
        invoicePrice: invPrice,
        variance: invPrice - poPrice
      });
    }
  });

  // 5. Evaluate Unresolved Discrepancies Flag Gates (Page 8-9)
  const discrepancyBlocking = unresolvedDiscrepancies.length > 0;

  // 6. Formulate Multi-Dimensional Outcome Status Matrix (Page 11-12)
  let status = 'MATCHED';
  let result = 'FULL_MATCH';

  if (discrepancyBlocking) {
    status = 'BLOCKED'; // Missing parameters or open disputes lock the workflow (Page 12)
    result = 'DISCREPANCY_PENDING';
  } else if (invoiceVariancesExceedOrderedBounds(invoiceQtyMap, poQtyMap)) {
    status = 'BLOCKED';
    result = 'BLOCKED'; // Invoiced volume exceeds contract bounds (Page 12)
  } else if (!priceMatched && !quantityMatched) {
    status = 'VARIANCE';
    result = 'MANUAL_REVIEW';
  } else if (!priceMatched) {
    status = 'VARIANCE';
    result = 'PRICE_VARIANCE';
  } else if (!quantityMatched) {
    status = 'VARIANCE';
    result = 'QUANTITY_VARIANCE';
  }

  return {
    status,
    result,
    quantity: { matched: quantityMatched, variances: quantityVariances },
    price: { matched: priceMatched, variances: priceVariances },
    discrepancy: { blocking: discrepancyBlocking, counts: unresolvedDiscrepancies.length }
  };
};

// Helper utility to identify over-billing trends
const invoiceVariancesExceedOrderedBounds = (invMap, poMap) => {
  for (const [pId, invQty] of invMap.entries()) {
    const ordered = poMap.get(pId) || 0;
    if (invQty > ordered) return true; // Blocked: Bill cannot exceed contract orders (Page 5-6)
  }
  return false;
};



