/**
 * Sales Module Utilities
 *
 * Pure calculation and normalization helpers.
 *
 * IMPORTANT:
 * - No database calls
 * - No inventory mutations
 * - No customer mutations
 * - No payment persistence
 * - No activity logging
 */

/**
 * Normalize a monetary number.
 *
 * JavaScript floating-point arithmetic can produce values such as:
 * 10.1 + 20.2 = 30.299999999999997
 *
 * For the BMS financial layer we normalize monetary calculations
 * to two decimal places.
 */
export const roundMoney = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return Math.round((numericValue + Number.EPSILON) * 100) / 100;
};

/**
 * Calculate the subtotal for one sale line.
 *
 * subtotal = quantity × unitPrice
 */
export const calculateLineSubtotal = ({
  quantity,
  unitPrice,
}) => {
  return roundMoney(
    Number(quantity) * Number(unitPrice)
  );
};

/**
 * Calculate the final amount for one sale line.
 *
 * lineTotal = lineSubtotal - lineDiscount
 */
export const calculateLineTotal = ({
  quantity,
  unitPrice,
  discount = 0,
}) => {
  const lineSubtotal = calculateLineSubtotal({
    quantity,
    unitPrice,
  });
  const lineDiscount = roundMoney(discount);
  return roundMoney(
    Math.max(0, lineSubtotal - lineDiscount)
  );
};

/**
 * Calculate complete sale subtotal from sale items.
 *
 * subtotal is based on each line's gross value,
 * before the sale-level discount.
 */
export const calculateSaleSubtotal = (items = []) => {
  return roundMoney(
    items.reduce((total, item) => {
      return (
        total +
        calculateLineSubtotal({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })
      );
    }, 0)
  );
};

/**
 * Calculate total line discounts.
 */
export const calculateLineDiscountTotal = (
  items = []
) => {
  return roundMoney(
    items.reduce((total, item) => {
      return total + Number(item.discount || 0);
    }, 0)
  );
};

/**
 * Calculate sale total.
 *
 * The sale-level discount is applied after the
 * line-level calculations.
 *
 * totalAmount = subtotal - line discounts - sale discount
 */
export const calculateSaleTotal = (
  items = [],
  saleDiscount = 0
) => {
  const subtotal = calculateSaleSubtotal(items);
  const lineDiscountTotal =
    calculateLineDiscountTotal(items);
  const normalizedSaleDiscount =
    roundMoney(saleDiscount);
  return roundMoney(
    Math.max(
      0,
      subtotal -
        lineDiscountTotal -
        normalizedSaleDiscount
    )
  );
};

/**
 * Calculate outstanding due.
 *
 * dueAmount = totalAmount - paidAmount
 */
export const calculateDueAmount = (
  totalAmount,
  paidAmount = 0
) => {
  const total = roundMoney(totalAmount);
  const paid = roundMoney(paidAmount);
  return roundMoney(
    Math.max(0, total - paid)
  );
};

/**
 * Calculates a complete sale transaction financial breakdown.
 */
export const calculateSaleFinancials = ({ items = [], saleDiscount = 0, paidAmount = 0 }) => {
  const subtotal = roundMoney(
    items.reduce((total, item) => total + Number(item.lineTotal || 0), 0)
  );
  const normalizedDiscount = roundMoney(saleDiscount);
  const totalAmount = roundMoney(Math.max(0, subtotal - normalizedDiscount));
  const normalizedPaidAmount = roundMoney(paidAmount);
  const dueAmount = roundMoney(Math.max(0, totalAmount - normalizedPaidAmount));

  return {
    subtotal,
    discount: normalizedDiscount,
    totalAmount,
    paidAmount: normalizedPaidAmount,
    dueAmount,
  };
};

/**
 * Calculate remaining amount after applying a payment.
 *
 * This is useful when processing a new customer payment.
 */
export const calculatePaymentBalance = ({
  currentDue,
  paymentAmount,
}) => {
  const due = roundMoney(currentDue);
  const payment = roundMoney(paymentAmount);
  return {
    previousDue: due,
    paymentAmount: payment,
    remainingDue: roundMoney(Math.max(0, due - payment)),
  };
};

/**
 * Verify the core financial invariant.
 *
 * paidAmount + dueAmount must equal totalAmount.
 */
export const isSaleFinanciallyBalanced = ({
  totalAmount,
  paidAmount,
  dueAmount,
}) => {
  const total = roundMoney(totalAmount);
  const paid = roundMoney(paidAmount);
  const due = roundMoney(dueAmount);
  return (
    roundMoney(paid + due) === total
  );
};

/**
 * Build the historical snapshot stored inside a Sale.
 *
 * Product identity/name/SKU should come from the database
 * product record in the Sales Service.
 *
 * The client must not be the authoritative source for
 * historical product information.
 */
export const buildSaleItemSnapshot = ({
  product,
  quantity,
  unitPrice,
  discount = 0,
}) => {
  const normalizedQuantity = Number(quantity);
  const normalizedUnitPrice = roundMoney(
    unitPrice !== undefined ? unitPrice : product.pricing?.sellingPrice || 0
  );
  const normalizedDiscount =
    roundMoney(discount);
  const lineTotal = roundMoney(
    Math.max(0, (normalizedQuantity * normalizedUnitPrice) - normalizedDiscount)
  );
  return {
    productId: product._id,
    productName: product.productName,
    sku: product.sku,
    quantity: normalizedQuantity,
    unitPrice: normalizedUnitPrice,
    discount: normalizedDiscount,
    lineTotal,
  };
};