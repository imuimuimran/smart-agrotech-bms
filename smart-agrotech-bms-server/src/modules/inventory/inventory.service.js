import mongoose from "mongoose";
import Product from "../products/product.model.js";
import { Warehouse } from "../warehouses/warehouse.model.js";
import { ProductWarehouseStock } from "./productWarehouseStock.model.js";
import { InventoryLog } from "./inventoryLog.model.js";
import { InventoryTransaction } from "../purchases/inventoryTransaction.model.js";
import {
  INVENTORY_LOG_TYPE,
  INVENTORY_MESSAGES,
  INVENTORY_REFERENCE_TYPE,
  INVENTORY_TRANSACTION_TYPE,
} from "./inventory.constants.js";


const toDecimal128 = (value) => {
  return mongoose.Types.Decimal128.fromString(
    roundMoney(value).toFixed(2)
  );
};

const decimalToNumber = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value.toString());
};

const getActiveProduct = async (productId, session) => {
  const product = await Product.findOne({ _id: productId, isDeleted: false }).session(session);
  if (!product) {
    throw new Error(INVENTORY_MESSAGES.PRODUCT_NOT_FOUND);
  }
  if (product.inventoryConfig?.trackInventory === false) {
    throw new Error(INVENTORY_MESSAGES.PRODUCT_NOT_TRACKED);
  }
  return product;
};

const getActiveWarehouse = async (warehouseId, session) => {
  const warehouse = await Warehouse.findOne({ _id: warehouseId, isDeleted: false }).session(session);
  if (!warehouse) {
    throw new Error(INVENTORY_MESSAGES.WAREHOUSE_NOT_FOUND);
  }
  if (warehouse.status !== "active") {
    throw new Error(INVENTORY_MESSAGES.WAREHOUSE_INACTIVE);
  }
  return warehouse;
};


const createInventoryLog = async ({
  productId,
  type,
  quantity,
  previousStock,
  currentStock,
  referenceId,
  referenceType,
  remarks = "",
  session,
}) => {
  const inventoryLog = new InventoryLog({
    productId,
    type,
    quantity, // The log array expects absolute value (positive integer)
    previousStock,
    currentStock,
    referenceId,
    referenceType,
    remarks,
  });
  await inventoryLog.save({ session });
  return inventoryLog;
};


const assertPositiveQuantity = (quantity) => {
  const normalizedQuantity = Number(quantity);
  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new Error(INVENTORY_MESSAGES.INVALID_QUANTITY);
  }
  return normalizedQuantity;
};

const assertUnitCost = (unitCost) => {
  const normalizedUnitCost = Number(unitCost);
  if (!Number.isFinite(normalizedUnitCost) || normalizedUnitCost < 0) {
    throw new Error(INVENTORY_MESSAGES.INVALID_UNIT_COST);
  }
  return normalizedUnitCost;
};

const resolveProduct = async (productId, session) => {
  const product = await Product.findById(productId).session(session);
  if (!product) {
    throw new Error(INVENTORY_MESSAGES.PRODUCT_NOT_FOUND);
  }
  if (product.inventoryConfig?.trackInventory === false) {
    throw new Error(INVENTORY_MESSAGES.PRODUCT_NOT_TRACKED);
  }
  return product;
};

const resolveWarehouse = async (warehouseId, session) => {
  const warehouse = await Warehouse.findById(warehouseId).session(session);
  if (!warehouse || warehouse.isDeleted) {
    throw new Error(INVENTORY_MESSAGES.WAREHOUSE_NOT_FOUND);
  }
  if (warehouse.status !== "active") {
    throw new Error(INVENTORY_MESSAGES.WAREHOUSE_INACTIVE);
  }
  return warehouse;
};

const updateProductCurrentStock = async (productId, session) => {
  const aggregation = await ProductWarehouseStock.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
      },
    },
    {
      $group: {
        _id: "$productId",
        totalStock: {
          $sum: "$physicalOnHand",
        },
      },
    },
  ]).session(session);

  const totalStock = aggregation.length > 0 ? aggregation[0].totalStock : 0;

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        currentStock: totalStock,
      },
    },
    { session }
  );

  return totalStock;
};

/**
 * Increase Stock.
 * Used atomically by Purchase Receipts, Sales Returns, and Inbound Movements.
 */
// export const increaseStock = async ({
//   productId,
//   warehouseId,
//   quantity,
//   transactionType = INVENTORY_TRANSACTION_TYPE.PURCHASE_RECEIPT,
//   logType = INVENTORY_LOG_TYPE.PURCHASE,
//   referenceType = INVENTORY_REFERENCE_TYPE.GOODS_RECEIPT,
//   referenceId,
//   unitCost,
//   postedBy,
//   batchNumber = undefined,
//   serialNumbers = [],
//   remarks = "",
//   session,
// }) => {
//   const execute = async (activeSession) => {
//     const normalizedQuantity = assertPositiveQuantity(quantity);
//     const normalizedUnitCost = assertUnitCost(unitCost);

//     if (!referenceId) {
//       throw new Error("Inventory referenceId is required.");
//     }

//     await resolveProduct(productId, activeSession);
//     await resolveWarehouse(warehouseId, activeSession);

//     const stockBefore = await ProductWarehouseStock.findOne({
//       productId,
//       warehouseId,
//     }).session(activeSession);

//     const previousStock = stockBefore?.physicalOnHand || 0;

//     const result = await ProductWarehouseStock.findOneAndUpdate(
//       { productId, warehouseId },
//       {
//         $inc: {
//           physicalOnHand: normalizedQuantity,
//           availableStock: normalizedQuantity,
//         },
//         $setOnInsert: {
//           reservedStock: 0,
//         },
//       },
//       {
//         new: true,
//         upsert: true,
//         session: activeSession,
//       }
//     );

//     if (!result) {
//       throw new Error(INVENTORY_MESSAGES.INVALID_STOCK_STATE);
//     }

//     // Defensive mathematical verification check
//     const expectedAvailable = result.physicalOnHand - result.reservedStock;
//     if (result.availableStock !== expectedAvailable || result.availableStock < 0) {
//       throw new Error(INVENTORY_MESSAGES.INVALID_STOCK_STATE);
//     }

//     // Persist Ledger Entity Entry
//     const transaction = new InventoryTransaction({
//       productId,
//       warehouseId,
//       quantity: normalizedQuantity,
//       transactionType,
//       referenceType,
//       referenceId,
//       unitCost: mongoose.Types.Decimal128.fromString(normalizedUnitCost.toFixed(2)),
//       batchNumber,
//       serialNumbers,
//       postedBy,
//     });
//     await transaction.save({ session: activeSession });

//     // Append history trace log entry row
//     await InventoryLog.create(
//       [
//         {
//           productId,
//           type:
//             transactionType === INVENTORY_TRANSACTION_TYPE.SALE
//               ? INVENTORY_LOG_TYPE.SALE
//               : transactionType.includes("RETURN")
//               ? INVENTORY_LOG_TYPE.RETURN
//               : transactionType.includes("EXCHANGE")
//               ? INVENTORY_LOG_TYPE.EXCHANGE
//               : INVENTORY_LOG_TYPE.PURCHASE,
//           quantity: normalizedQuantity,
//           previousStock,
//           currentStock: result.physicalOnHand,
//           referenceId,
//           referenceType,
//           remarks,
//         },
//       ],
//       { session: activeSession }
//     );

//     const totalProductStock = await updateProductCurrentStock(productId, activeSession);

//     return {
//       stock: result,
//       transaction,
//       previousStock,
//       currentStock: result.physicalOnHand,
//       totalProductStock,
//     };
//   };

//   if (session) {
//     return execute(session);
//   }

//   const ownSession = await mongoose.startSession();
//   try {
//     ownSession.startTransaction();
//     const result = await execute(ownSession);
//     await ownSession.commitTransaction();
//     return result;
//   } catch (error) {
//     await ownSession.abortTransaction();
//     throw error;
//   } finally {
//     await ownSession.endSession();
//   }
// };


/**
 * Atomic Inventory Stock Increments Layer (Procurement / Adjustments In)
 */
const increaseStock = async ({
  productId,
  warehouseId,
  quantity,
  unitCost,
  referenceType,
  referenceId,
  postedBy,
  transactionType = INVENTORY_TRANSACTION_TYPE.PURCHASE_RECEIPT,
  logType = INVENTORY_LOG_TYPE.PURCHASE,
  remarks = "",
  batchNumber = undefined,
  serialNumbers = [],
  session,
}) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(INVENTORY_MESSAGES.INVALID_QUANTITY);
  }
  const normalizedUnitCost = Number(unitCost);
  if (!Number.isFinite(normalizedUnitCost) || normalizedUnitCost < 0) {
    throw new Error(INVENTORY_MESSAGES.INVALID_UNIT_COST);
  }

  const product = await getActiveProduct(productId, session);
  await getActiveWarehouse(warehouseId, session);

  let stock = await ProductWarehouseStock.findOne({ productId, warehouseId }).session(session);
  if (!stock) {
    stock = new ProductWarehouseStock({
      productId,
      warehouseId,
      physicalOnHand: 0,
      reservedStock: 0,
      availableStock: 0,
      averageUnitCost: toDecimal128(0),
    });
  }

  const existingQuantity = Number(stock.physicalOnHand || 0);
  const existingAverageCost = decimalToNumber(stock.averageUnitCost);
  
  // Authoritative WAC calculation recalculation workflow
  const newAverageCost = calculateWeightedAverageCost({
    existingQuantity,
    existingAverageCost,
    incomingQuantity: quantity,
    incomingUnitCost: normalizedUnitCost,
  });

  const previousStock = existingQuantity;
  stock.physicalOnHand = existingQuantity + quantity;
  stock.availableStock = stock.physicalOnHand - Number(stock.reservedStock || 0);
  
  if (stock.availableStock < 0) {
    throw new Error(INVENTORY_MESSAGES.INVALID_STOCK_STATE);
  }
  
  stock.averageUnitCost = toDecimal128(newAverageCost);
  await stock.save({ session });

  const inventoryTransaction = new InventoryTransaction({
    productId: product._id,
    warehouseId,
    quantity, // Positive ledger configuration
    transactionType,
    referenceType,
    referenceId,
    unitCost: toDecimal128(normalizedUnitCost),
    batchNumber,
    serialNumbers,
    postedBy,
  });
  await inventoryTransaction.save({ session });

  await createInventoryLog({
    productId: product._id,
    type: logType,
    quantity,
    previousStock,
    currentStock: stock.physicalOnHand,
    referenceId,
    referenceType,
    remarks,
    session,
  });

  await synchronizeProductCurrentStock(product._id, session);

  return { stock, inventoryTransaction };
};


// /**
//  * Decrease Stock.
//  * Atomic conditional query prevents concurrent race-condition data updates.
//  */
// export const decreaseStock = async ({
//   productId,
//   warehouseId,
//   quantity,
//   transactionType = INVENTORY_TRANSACTION_TYPE.SALE,
//   referenceType = INVENTORY_REFERENCE_TYPE.SALE,
//   referenceId,
//   unitCost,
//   postedBy,
//   batchNumber = null,
//   serialNumbers = [],
//   remarks = "",
//   session,
// }) => {
//   const execute = async (activeSession) => {
//     const normalizedQuantity = assertPositiveQuantity(quantity);
//     const normalizedUnitCost = assertUnitCost(unitCost);

//     if (!referenceId) {
//       throw new Error("Inventory referenceId is required.");
//     }

//     await resolveProduct(productId, activeSession);
//     await resolveWarehouse(warehouseId, activeSession);

//     // Atomic conditional block: Ensure available stock is greater than or equal to required allocation
//     const stockAfter = await ProductWarehouseStock.findOneAndUpdate(
//       {
//         productId,
//         warehouseId,
//         availableStock: { $gte: normalizedQuantity },
//         physicalOnHand: { $gte: normalizedQuantity },
//       },
//       {
//         $inc: {
//           physicalOnHand: -normalizedQuantity,
//           availableStock: -normalizedQuantity,
//         },
//       },
//       {
//         new: true,
//         session: activeSession,
//       }
//     );

//     if (!stockAfter) {
//       throw new Error(INVENTORY_MESSAGES.INSUFFICIENT_STOCK);
//     }

//     const currentStock = stockAfter.physicalOnHand;
//     const previousStock = currentStock + normalizedQuantity;

//     const expectedAvailable = stockAfter.physicalOnHand - stockAfter.reservedStock;
//     if (stockAfter.availableStock !== expectedAvailable || stockAfter.availableStock < 0 || stockAfter.physicalOnHand < 0) {
//       throw new Error(INVENTORY_MESSAGES.INVALID_STOCK_STATE);
//     }

//     // Negative quantity denotes outbound inventory movement ledger transaction row
//     const transaction = new InventoryTransaction({
//       productId,
//       warehouseId,
//       quantity: -normalizedQuantity,
//       transactionType,
//       referenceType,
//       referenceId,
//       unitCost: mongoose.Types.Decimal128.fromString(normalizedUnitCost.toFixed(2)),
//       batchNumber,
//       serialNumbers,
//       postedBy,
//     });
//     await transaction.save({ session: activeSession });

//     await InventoryLog.create(
//       [
//         {
//           productId,
//           type:
//             transactionType === INVENTORY_TRANSACTION_TYPE.SALE
//               ? INVENTORY_LOG_TYPE.SALE
//               : transactionType.includes("RETURN")
//               ? INVENTORY_LOG_TYPE.RETURN
//               : transactionType.includes("EXCHANGE")
//               ? INVENTORY_LOG_TYPE.EXCHANGE
//               : INVENTORY_LOG_TYPE.ADJUSTMENT,
//           quantity: normalizedQuantity,
//           previousStock,
//           currentStock,
//           referenceId,
//           referenceType,
//           remarks,
//         },
//       ],
//       { session: activeSession }
//     );

//     const totalProductStock = await updateProductCurrentStock(productId, activeSession);

//     return {
//       stock: stockAfter,
//       transaction,
//       previousStock,
//       currentStock,
//       totalProductStock,
//     };
//   };

//   if (session) {
//     return execute(session);
//   }

//   const ownSession = await mongoose.startSession();
//   try {
//     ownSession.startTransaction();
//     const result = await execute(ownSession);
//     await ownSession.commitTransaction();
//     return result;
//   } catch (error) {
//     await ownSession.abortTransaction();
//     throw error;
//   } finally {
//     await ownSession.endSession();
//   }
// };


/**
 * Concurrency-Safe Atomic Decrement Stock Layer (Customer Sales Invoicing / Adjustments Out)
 */
const decreaseStock = async ({
  productId,
  warehouseId,
  quantity,
  referenceType,
  referenceId,
  postedBy,
  transactionType = INVENTORY_TRANSACTION_TYPE.SALE,
  logType = INVENTORY_LOG_TYPE.SALE,
  remarks = "",
  batchNumber = undefined,
  serialNumbers = [],
  session,
}) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(INVENTORY_MESSAGES.INVALID_QUANTITY);
  }

  const product = await getActiveProduct(productId, session);
  await getActiveWarehouse(warehouseId, session);

  // Pre-load current state to access valuation costs prior to execution updates
  const preStockRecord = await ProductWarehouseStock.findOne({ productId, warehouseId }).session(session);
  if (!preStockRecord) {
    throw new Error(INVENTORY_MESSAGES.INSUFFICIENT_STOCK);
  }
  const currentAverageCost = decimalToNumber(preStockRecord.averageUnitCost);

  // Atomic conditional find query blocks race-condition multi-sale drifts
  const updatedStock = await ProductWarehouseStock.findOneAndUpdate(
    {
      productId,
      warehouseId,
      availableStock: { $gte: quantity },
      physicalOnHand: { $gte: quantity },
    },
    {
      $inc: {
        physicalOnHand: -quantity,
        availableStock: -quantity,
      },
    },
    { new: true, session }
  );

  if (!updatedStock) {
    throw new Error(INVENTORY_MESSAGES.INSUFFICIENT_STOCK);
  }

  const currentStock = Number(updatedStock.physicalOnHand);
  const previousStock = currentStock + quantity;

  const inventoryTransaction = new InventoryTransaction({
    productId: product._id,
    warehouseId,
    quantity: -quantity, // Negative integer represents outbound fulfillment actions
    transactionType,
    referenceType,
    referenceId,
    unitCost: toDecimal128(currentAverageCost), // Frozen cost snapshot baseline mapping
    batchNumber,
    serialNumbers,
    postedBy,
  });
  await inventoryTransaction.save({ session });

  await createInventoryLog({
    productId: product._id,
    type: logType,
    quantity,
    previousStock,
    currentStock,
    referenceId,
    referenceType,
    remarks,
    session,
  });

  await synchronizeProductCurrentStock(product._id, session);

  return { stock: updatedStock, inventoryTransaction };
};




// /**
//  * Administrative Stock Adjustment Router.
//  */
// export const adjustStock = async ({
//   productId,
//   warehouseId,
//   quantity,
//   referenceId,
//   unitCost = 0,
//   postedBy,
//   remarks = "",
//   session,
// }) => {
//   const normalizedQuantity = Number(quantity);
//   if (!Number.isFinite(normalizedQuantity) || normalizedQuantity === 0) {
//     throw new Error(INVENTORY_MESSAGES.INVALID_QUANTITY);
//   }

//   if (normalizedQuantity > 0) {
//     return increaseStock({
//       productId,
//       warehouseId,
//       quantity: normalizedQuantity,
//     transactionType: INVENTORY_TRANSACTION_TYPE.ADJUSTMENT_IN,
//     referenceType: INVENTORY_REFERENCE_TYPE.STOCK_ADJUSTMENT,
//     referenceId,
//     unitCost,
//     postedBy,
//     remarks,
//     session,
// });
// }

// return decreaseStock({
//     productId,
//     warehouseId,
//     quantity: Math.abs(normalizedQuantity),
//     transactionType: INVENTORY_TRANSACTION_TYPE.ADJUSTMENT_OUT,
//     referenceType: INVENTORY_REFERENCE_TYPE.STOCK_ADJUSTMENT,
//     referenceId,
//     unitCost,
//     postedBy,
//     remarks,
//     session,
// });
// };


/**
 * Stock Correction Adjustments Router Routing Engine
 */
const adjustStock = async ({
  productId,
  warehouseId,
  quantity,
  unitCost = 0,
  referenceId,
  postedBy,
  remarks = "",
  session,
}) => {
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new Error(INVENTORY_MESSAGES.INVALID_QUANTITY);
  }

  if (quantity > 0) {
    return increaseStock({
      productId,
      warehouseId,
      quantity,
      unitCost,
      referenceType: INVENTORY_REFERENCE_TYPE.STOCK_ADJUSTMENT,
      referenceId,
      postedBy,
      transactionType: INVENTORY_TRANSACTION_TYPE.ADJUSTMENT_IN,
      logType: INVENTORY_LOG_TYPE.ADJUSTMENT,
      remarks,
      session,
    });
  }

  return decreaseStock({
    productId,
    warehouseId,
    quantity: Math.abs(quantity),
    referenceType: INVENTORY_REFERENCE_TYPE.STOCK_ADJUSTMENT,
    referenceId,
    postedBy,
    transactionType: INVENTORY_TRANSACTION_TYPE.ADJUSTMENT_OUT,
    logType: INVENTORY_LOG_TYPE.ADJUSTMENT,
    remarks,
    session,
  });
};






/**
    Retrieve Stock Balance details for a singular Warehouse mapping.
 */

// export const getWarehouseStock = async ({ productId, warehouseId, session = null }) => {
//     const query = ProductWarehouseStock.findOne({ productId, warehouseId });
//     if (session) {
//         query.session(session);
//     }
//     return query;
// };

const getWarehouseStock = async ({ productId, warehouseId }) => {
  return ProductWarehouseStock.findOne({ productId, warehouseId }).populate("warehouseId");
};


// /**
//  Retrieve Stock Balance aggregations across all global system Warehouses.
//  */

// export const getProductStock = async ({ productId, session = null }) => {
//     const query = ProductWarehouseStock.find({ productId }).populate(
//         "warehouseId",
//         "warehouseName warehouseCode status"
//     );
//     if (session) {
//         query.session(session);
//     }
//     const warehouses = await query;
//     const totals = warehouses.reduce(
//         (accumulator, item) => {
//             accumulator.physicalOnHand += item.physicalOnHand;
//             accumulator.reservedStock += item.reservedStock;
//             accumulator.availableStock += item.availableStock;
//             return accumulator;
//         },
//         { physicalOnHand: 0, reservedStock: 0, availableStock: 0 }
//     );
//     return {
//         productId,
//         warehouses,
//         totals,
//     };
// };


const getProductStock = async (productId) => {
  const stockRows = await ProductWarehouseStock.find({ productId }).populate("warehouseId");
  
  const totalPhysicalStock = stockRows.reduce((total, row) => total + Number(row.physicalOnHand || 0), 0);
  const totalAvailableStock = stockRows.reduce((total, row) => total + Number(row.availableStock || 0), 0);

  return { stockRows, totalPhysicalStock, totalAvailableStock };
};


/**
 Manual Aggregate Reconciliation Utility Sync.
 */

// export const synchronizeProductCurrentStock = async (productId, session = null) => {
//     const run = async (activeSession) => {
//         return updateProductCurrentStock(productId, activeSession);
//     };
    
//     if (session) {
//         return run(session);
//     }
//     const ownSession = await mongoose.startSession();
//     try {
//         ownSession.startTransaction();
//         const result = await run(ownSession);
//         await ownSession.commitTransaction();
//         return result;
//     } 
//     catch (error) {
//         await ownSession.abortTransaction();
//         throw error;
//     } 
//     finally {
//         await ownSession.endSession();
//     }
// };

const synchronizeProductCurrentStock = async (productId, session) => {
  const result = await ProductWarehouseStock.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: "$productId", totalPhysicalStock: { $sum: "$physicalOnHand" } } },
  ]).session(session);

  const totalPhysicalStock = result.length > 0 ? Number(result[0].totalPhysicalStock) : 0;

  await Product.updateOne(
    { _id: productId },
    { $set: { currentStock: totalPhysicalStock } },
    { session }
  );
  return totalPhysicalStock;
};

export const InventoryService = {
    increaseStock,
    decreaseStock,
    adjustStock,
    getWarehouseStock,
    getProductStock,
    synchronizeProductCurrentStock,
    createInventoryLog,
};