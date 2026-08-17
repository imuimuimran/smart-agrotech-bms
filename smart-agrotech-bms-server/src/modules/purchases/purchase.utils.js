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

