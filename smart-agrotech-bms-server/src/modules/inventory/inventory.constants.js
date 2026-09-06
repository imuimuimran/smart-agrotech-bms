export const INVENTORY_TRANSACTION_TYPE = {
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
};

export const INVENTORY_LOG_TYPE = {
  PURCHASE: "purchase",
  SALE: "sale",
  ADJUSTMENT: "adjustment",
  RETURN: "return",
  EXCHANGE: "exchange",
};

export const INVENTORY_REFERENCE_TYPE = {
  GOODS_RECEIPT: "GOODS_RECEIPT",
  SALE: "SALE",
  STOCK_ADJUSTMENT: "STOCK_ADJUSTMENT",
  PURCHASE_RETURN: "PURCHASE_RETURN",
  SALES_RETURN: "SALES_RETURN",
  PURCHASE_EXCHANGE: "PURCHASE_EXCHANGE",
  SALES_EXCHANGE: "SALES_EXCHANGE",
};

export const INVENTORY_MESSAGES = {
  PRODUCT_NOT_FOUND: "Product not found.",
  WAREHOUSE_NOT_FOUND: "Warehouse not found.",
  WAREHOUSE_INACTIVE: "Warehouse is inactive.",
  STOCK_NOT_FOUND: "Warehouse stock record not found.",
  INSUFFICIENT_STOCK: "Insufficient available stock for this inventory operation.",
  INVALID_QUANTITY: "Inventory quantity must be greater than zero.",
  INVALID_STOCK_STATE: "Invalid inventory stock state.",
  STOCK_UPDATED: "Inventory stock updated successfully.",
  STOCK_ADJUSTED: "Inventory stock adjusted successfully.",
};
