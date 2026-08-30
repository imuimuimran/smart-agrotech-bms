// Generic core action operations to keep vocabulary maintainable
export const ACTIVITY_ACTIONS = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  RESTORE: 'RESTORE',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  RECORD: 'RECORD',
});

// Explicit module domain mappings present across your active system
export const ACTIVITY_MODULES = Object.freeze({
  AUTH: 'AUTH',
  USER: 'USER',
  PRODUCT: 'PRODUCT',
  CATEGORY: 'CATEGORY',
  BRAND: 'BRAND',
  SUPPLIER: 'SUPPLIER',
  PURCHASE: 'PURCHASE',
  INVENTORY: 'INVENTORY',
  CUSTOMER: 'CUSTOMER',
  EXPENSE: 'EXPENSE',
  PAYMENT: 'PAYMENT',
  REPORT: 'REPORT',
});

// Derived arrays utilized seamlessly by Zod validation schemas
export const ACTIVITY_ACTION_LIST = Object.freeze(Object.values(ACTIVITY_ACTIONS));
export const ACTIVITY_MODULE_LIST = Object.freeze(Object.values(ACTIVITY_MODULES));
