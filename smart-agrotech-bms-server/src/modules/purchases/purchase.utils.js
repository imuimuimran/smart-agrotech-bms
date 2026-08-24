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


