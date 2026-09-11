export const INVENTORY_TRANSACTION_TYPE = Object.freeze({
  PURCHASE_RECEIPT: "PURCHASE_RECEIPT",
  SALE: "SALE",
  ADJUSTMENT_IN: "ADJUSTMENT_IN",
  ADJUSTMENT_OUT: "ADJUSTMENT_OUT",
  PURCHASE_RETURN: "PURCHASE_RETURN",
  SALES_RETURN: "SALES_RETURN",
  PURCHASE_EXCHANGE_OUT: "PURCHASE_EXCHANGE_OUT",
  PURCHASE_EXCHANGE_IN: "PURCHASE_EXCHANGE_IN",
  SALES_EXCHANGE_OUT: "SALES_EXCHANGE_OUT",
  SALES_EXCHANGE_IN: "SALES_EXCHANGE_IN",
});

export const INVENTORY_LOG_TYPE = Object.freeze({
  PURCHASE: "purchase",
  SALE: "sale",
  ADJUSTMENT: "adjustment",
  RETURN: "return",
  EXCHANGE: "exchange",
});

export const INVENTORY_REFERENCE_TYPE = Object.freeze({
  GOODS_RECEIPT: "GOODS_RECEIPT",
  SALE: "SALE",
  STOCK_ADJUSTMENT: "STOCK_ADJUSTMENT",
  PURCHASE_RETURN: "PURCHASE_RETURN",
  SALES_RETURN: "SALES_RETURN",
  PURCHASE_EXCHANGE: "PURCHASE_EXCHANGE",
  SALES_EXCHANGE: "SALES_EXCHANGE",
});

export const INVENTORY_MESSAGES = Object.freeze({
  PRODUCT_NOT_FOUND: "Product not found.",
  PRODUCT_NOT_TRACKED: "Product inventory tracking is disabled.",
  WAREHOUSE_NOT_FOUND: "Warehouse not found.",
  WAREHOUSE_INACTIVE: "Warehouse is inactive.",
  STOCK_NOT_FOUND: "Warehouse stock record not found.",
  INVALID_QUANTITY: "Inventory quantity must be greater than zero.",
  INVALID_UNIT_COST: "Inventory unit cost is required and cannot be negative.",
  INSUFFICIENT_STOCK: "Insufficient available stock for this inventory operation.",
  INVALID_STOCK_STATE: "Invalid inventory stock state.",
  STOCK_UPDATED: "Inventory stock updated successfully.",
});