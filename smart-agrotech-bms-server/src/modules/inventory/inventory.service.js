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
export const increaseStock = async ({
  productId,
  warehouseId,
  quantity,
  transactionType = INVENTORY_TRANSACTION_TYPE.PURCHASE_RECEIPT,
  referenceType = INVENTORY_REFERENCE_TYPE.GOODS_RECEIPT,
  referenceId,
  unitCost,
  postedBy,
  batchNumber = null,
  serialNumbers = [],
  remarks = "",
  session,
}) => {
  const execute = async (activeSession) => {
    const normalizedQuantity = assertPositiveQuantity(quantity);
    const normalizedUnitCost = assertUnitCost(unitCost);

    if (!referenceId) {
      throw new Error("Inventory referenceId is required.");
    }

    await resolveProduct(productId, activeSession);
    await resolveWarehouse(warehouseId, activeSession);

    const stockBefore = await ProductWarehouseStock.findOne({
      productId,
      warehouseId,
    }).session(activeSession);

    const previousStock = stockBefore?.physicalOnHand || 0;

    const result = await ProductWarehouseStock.findOneAndUpdate(
      { productId, warehouseId },
      {
        $inc: {
          physicalOnHand: normalizedQuantity,
          availableStock: normalizedQuantity,
        },
        $setOnInsert: {
          reservedStock: 0,
        },
      },
      {
        new: true,
        upsert: true,
        session: activeSession,
      }
    );

    if (!result) {
      throw new Error(INVENTORY_MESSAGES.INVALID_STOCK_STATE);
    }

    // Defensive mathematical verification check
    const expectedAvailable = result.physicalOnHand - result.reservedStock;
    if (result.availableStock !== expectedAvailable || result.availableStock < 0) {
      throw new Error(INVENTORY_MESSAGES.INVALID_STOCK_STATE);
    }

    // Persist Ledger Entity Entry
    const transaction = new InventoryTransaction({
      productId,
      warehouseId,
      quantity: normalizedQuantity,
      transactionType,
      referenceType,
      referenceId,
      unitCost: mongoose.Types.Decimal128.fromString(normalizedUnitCost.toFixed(2)),
      batchNumber,
      serialNumbers,
      postedBy,
    });
    await transaction.save({ session: activeSession });

    // Append history trace log entry row
    await InventoryLog.create(
      [
        {
          productId,
          type:
            transactionType === INVENTORY_TRANSACTION_TYPE.SALE
              ? INVENTORY_LOG_TYPE.SALE
              : transactionType.includes("RETURN")
              ? INVENTORY_LOG_TYPE.RETURN
              : transactionType.includes("EXCHANGE")
              ? INVENTORY_LOG_TYPE.EXCHANGE
              : INVENTORY_LOG_TYPE.PURCHASE,
          quantity: normalizedQuantity,
          previousStock,
          currentStock: result.physicalOnHand,
          referenceId,
          referenceType,
          remarks,
        },
      ],
      { session: activeSession }
    );

    const totalProductStock = await updateProductCurrentStock(productId, activeSession);

    return {
      stock: result,
      transaction,
      previousStock,
      currentStock: result.physicalOnHand,
      totalProductStock,
    };
  };

  if (session) {
    return execute(session);
  }

  const ownSession = await mongoose.startSession();
  try {
    ownSession.startTransaction();
    const result = await execute(ownSession);
    await ownSession.commitTransaction();
    return result;
  } catch (error) {
    await ownSession.abortTransaction();
    throw error;
  } finally {
    await ownSession.endSession();
  }
};

/**
 * Decrease Stock.
 * Atomic conditional query prevents concurrent race-condition data updates.
 */
export const decreaseStock = async ({
  productId,
  warehouseId,
  quantity,
  transactionType = INVENTORY_TRANSACTION_TYPE.SALE,
  referenceType = INVENTORY_REFERENCE_TYPE.SALE,
  referenceId,
  unitCost,
  postedBy,
  batchNumber = null,
  serialNumbers = [],
  remarks = "",
  session,
}) => {
  const execute = async (activeSession) => {
    const normalizedQuantity = assertPositiveQuantity(quantity);
    const normalizedUnitCost = assertUnitCost(unitCost);

    if (!referenceId) {
      throw new Error("Inventory referenceId is required.");
    }

    await resolveProduct(productId, activeSession);
    await resolveWarehouse(warehouseId, activeSession);

    // Atomic conditional block: Ensure available stock is greater than or equal to required allocation
    const stockAfter = await ProductWarehouseStock.findOneAndUpdate(
      {
        productId,
        warehouseId,
        availableStock: { $gte: normalizedQuantity },
        physicalOnHand: { $gte: normalizedQuantity },
      },
      {
        $inc: {
          physicalOnHand: -normalizedQuantity,
          availableStock: -normalizedQuantity,
        },
      },
      {
        new: true,
        session: activeSession,
      }
    );

    if (!stockAfter) {
      throw new Error(INVENTORY_MESSAGES.INSUFFICIENT_STOCK);
    }

    const currentStock = stockAfter.physicalOnHand;
    const previousStock = currentStock + normalizedQuantity;

    const expectedAvailable = stockAfter.physicalOnHand - stockAfter.reservedStock;
    if (stockAfter.availableStock !== expectedAvailable || stockAfter.availableStock < 0 || stockAfter.physicalOnHand < 0) {
      throw new Error(INVENTORY_MESSAGES.INVALID_STOCK_STATE);
    }

    // Negative quantity denotes outbound inventory movement ledger transaction row
    const transaction = new InventoryTransaction({
      productId,
      warehouseId,
      quantity: -normalizedQuantity,
      transactionType,
      referenceType,
      referenceId,
      unitCost: mongoose.Types.Decimal128.fromString(normalizedUnitCost.toFixed(2)),
      batchNumber,
      serialNumbers,
      postedBy,
    });
    await transaction.save({ session: activeSession });

    await InventoryLog.create(
      [
        {
          productId,
          type:
            transactionType === INVENTORY_TRANSACTION_TYPE.SALE
              ? INVENTORY_LOG_TYPE.SALE
              : transactionType.includes("RETURN")
              ? INVENTORY_LOG_TYPE.RETURN
              : transactionType.includes("EXCHANGE")
              ? INVENTORY_LOG_TYPE.EXCHANGE
              : INVENTORY_LOG_TYPE.ADJUSTMENT,
          quantity: normalizedQuantity,
          previousStock,
          currentStock,
          referenceId,
          referenceType,
          remarks,
        },
      ],
      { session: activeSession }
    );

    const totalProductStock = await updateProductCurrentStock(productId, activeSession);

    return {
      stock: stockAfter,
      transaction,
      previousStock,
      currentStock,
      totalProductStock,
    };
  };

  if (session) {
    return execute(session);
  }

  const ownSession = await mongoose.startSession();
  try {
    ownSession.startTransaction();
    const result = await execute(ownSession);
    await ownSession.commitTransaction();
    return result;
  } catch (error) {
    await ownSession.abortTransaction();
    throw error;
  } finally {
    await ownSession.endSession();
  }
};

/**
 * Administrative Stock Adjustment Router.
 */
export const adjustStock = async ({
  productId,
  warehouseId,
  quantity,
  referenceId,
  unitCost = 0,
  postedBy,
  remarks = "",
  session,
}) => {
  const normalizedQuantity = Number(quantity);
  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity === 0) {
    throw new Error(INVENTORY_MESSAGES.INVALID_QUANTITY);
  }

  if (normalizedQuantity > 0) {
    return increaseStock({
      productId,
      warehouseId,
      quantity: normalizedQuantity,
    transactionType: INVENTORY_TRANSACTION_TYPE.ADJUSTMENT_IN,
    referenceType: INVENTORY_REFERENCE_TYPE.STOCK_ADJUSTMENT,
    referenceId,
    unitCost,
    postedBy,
    remarks,
    session,
});
}

return decreaseStock({
    productId,
    warehouseId,
    quantity: Math.abs(normalizedQuantity),
    transactionType: INVENTORY_TRANSACTION_TYPE.ADJUSTMENT_OUT,
    referenceType: INVENTORY_REFERENCE_TYPE.STOCK_ADJUSTMENT,
    referenceId,
    unitCost,
    postedBy,
    remarks,
    session,
});
};
/**
    Retrieve Stock Balance details for a singular Warehouse mapping.
 */

export const getWarehouseStock = async ({ productId, warehouseId, session = null }) => {
    const query = ProductWarehouseStock.findOne({ productId, warehouseId });
    if (session) {
        query.session(session);
    }
    return query;
};
/**
 Retrieve Stock Balance aggregations across all global system Warehouses.
 */

export const getProductStock = async ({ productId, session = null }) => {
    const query = ProductWarehouseStock.find({ productId }).populate(
        "warehouseId",
        "warehouseName warehouseCode status"
    );
    if (session) {
        query.session(session);
    }
    const warehouses = await query;
    const totals = warehouses.reduce(
        (accumulator, item) => {
            accumulator.physicalOnHand += item.physicalOnHand;
            accumulator.reservedStock += item.reservedStock;
            accumulator.availableStock += item.availableStock;
            return accumulator;
        },
        { physicalOnHand: 0, reservedStock: 0, availableStock: 0 }
    );
    return {
        productId,
        warehouses,
        totals,
    };
};
/**
 Manual Aggregate Reconciliation Utility Sync.
 */

export const synchronizeProductCurrentStock = async (productId, session = null) => {
    const run = async (activeSession) => {
        return updateProductCurrentStock(productId, activeSession);
    };
    
    if (session) {
        return run(session);
    }
    const ownSession = await mongoose.startSession();
    try {
        ownSession.startTransaction();
        const result = await run(ownSession);
        await ownSession.commitTransaction();
        return result;
    } 
    catch (error) {
        await ownSession.abortTransaction();
        throw error;
    } 
    finally {
        await ownSession.endSession();
    }
};

export const InventoryService = {
    increaseStock,
    decreaseStock,
    adjustStock,
    getWarehouseStock,
    getProductStock,
    synchronizeProductCurrentStock,
};