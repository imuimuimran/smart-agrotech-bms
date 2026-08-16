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
