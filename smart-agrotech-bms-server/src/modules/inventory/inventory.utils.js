/**
 * Normalize a monetary number to two decimal places.
 * Safeguards system layer values against native JavaScript floating-point arithmetic anomalies.
 */
export const roundMoney = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return Math.round((numericValue + Number.EPSILON) * 100) / 100;
};

/**
 * Calculates real-time Weighted Average Cost (WAC) boundaries for incoming procurement.
 * 
 * Formula Matrix:
 * New WAC = (Existing Stock Value + Incoming Stock Value) / Total Quantity Sum
 */
export const calculateWeightedAverageCost = ({
  existingQuantity,
  existingAverageCost,
  incomingQuantity,
  incomingUnitCost,
}) => {
  const existingQty = Number(existingQuantity);
  const existingCost = Number(existingAverageCost);
  const incomingQty = Number(incomingQuantity);
  const incomingCost = Number(incomingUnitCost);

  if (existingQty < 0 || incomingQty <= 0 || existingCost < 0 || incomingCost < 0) {
    throw new Error("Invalid weighted average cost inputs mapping parameters provided.");
  }

  const existingValue = existingQty * existingCost;
  const incomingValue = incomingQty * incomingCost;
  const totalQuantity = existingQty + incomingQty;

  if (totalQuantity === 0) {
    return 0;
  }

  return roundMoney((existingValue + incomingValue) / totalQuantity);
};
