import { Sale } from "../sales/sale.model.js";
import { SaleReturn } from "../sales/saleReturn.model.js";
import { SALE_STATUS } from "../sales/sale.constants.js";
import { SALE_RETURN_STATUS, SALE_RETURN_TYPE } from "../sales/saleReturn.constants.js";
import { Purchase } from "../purchases/purchase.model.js";
import Product from "../products/product.model.js";
import { ProductWarehouseStock } from "../inventory/productWarehouseStock.model.js";
import { InventoryTransaction } from "../purchases/inventoryTransaction.model.js";
import { getDateRange } from "./report.utils.js";
import { REPORTABLE_PURCHASE_STATUSES } from "./report.constants.js";
import { Expense } from "../expenses/expense.model.js";

const REVENUE_SALE_STATUSES = [
  SALE_STATUS.CONFIRMED,
  SALE_STATUS.PARTIAL_PAID,
  SALE_STATUS.PAID,
  SALE_STATUS.COMPLETED,
  SALE_STATUS.RETURNED,
];

/**
 * Runs a transactional aggregation query on the Sales collection.
 * Honors the global soft-delete preprocessing filter pattern via explicit $match blocks.
 */
const getSalesReport = async (query) => {
  const { period = "daily", startDate, endDate } = query;
  
  const { start, end } = getDateRange({ period, startDate, endDate });

  const matchStage = {
    isDeleted: false, // Enforce our global soft-delete system contract
    saleDate: {
      $gte: start,
      $lte: end,
    },
  };

  const [summary] = await Sale.aggregate([
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
        totalPaid: { $sum: "$paidAmount" },
        totalDue: { $sum: "$dueAmount" },
      },
    },
    {
      $project: {
        _id: 0,
        totalSales: 1,
        totalAmount: 1,
        totalPaid: 1,
        totalDue: 1,
      },
    },
  ]);

  return {
    period,
    startDate: start,
    endDate: end,
    summary: summary || {
      totalSales: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalDue: 0,
    },
  };
};


/**
 * Compiles a real-time summary matrix of operational purchases.
 * Casts numeric types from string/Decimal128 variants to double safely inside the pipeline.
 */
const getPurchaseReport = async (query) => {
  const { period = "daily", startDate, endDate } = query;
  
  const { start, end } = getDateRange({ period, startDate, endDate });

  const matchStage = {
    isDeleted: false, // Enforce our global soft-delete preprocessing core firewall
    purchaseDate: {
      $gte: start,
      $lte: end,
    },
    status: {
      $in: REPORTABLE_PURCHASE_STATUSES,
    },
  };

  const [summary] = await Purchase.aggregate([
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: null,
        totalPurchases: { $sum: 1 },
        totalSubtotal: { $sum: { $toDouble: "$subtotal" } },
        totalDiscount: { $sum: { $toDouble: "$discount" } },
        totalTax: { $sum: { $toDouble: "$tax" } },
        totalShippingCost: { $sum: { $toDouble: "$shippingCost" } },
        totalOtherCharges: { $sum: { $toDouble: "$otherCharges" } },
        totalAmount: { $sum: { $toDouble: "$grandTotal" } },
      },
    },
    {
      $project: {
        _id: 0,
        totalPurchases: 1,
        totalSubtotal: 1,
        totalDiscount: 1,
        totalTax: 1,
        totalShippingCost: 1,
        totalOtherCharges: 1,
        totalAmount: 1,
      },
    },
  ]);

  return {
    period,
    startDate: start,
    endDate: end,
    summary: summary || {
      totalPurchases: 0,
      totalSubtotal: 0,
      totalDiscount: 0,
      totalTax: 0,
      totalShippingCost: 0,
      totalOtherCharges: 0,
      totalAmount: 0,
    },
  };
};

const getCurrentStockReport = async () => {
  const data = await ProductWarehouseStock.find({ isDeleted: false }) // Enforce soft-delete contract
    .populate("productId", "publicId productName sku inventoryConfig status")
    .populate("warehouseId", "publicId warehouseName warehouseCode")
    .sort({ updatedAt: -1 });

  return data.map((stock) => ({
    product: stock.productId,
    warehouse: stock.warehouseId,
    physicalOnHand: Number(stock.physicalOnHand || 0),
    reservedStock: Number(stock.reservedStock || 0),
    availableStock: Number(stock.availableStock || 0),
    averageUnitCost: Number(stock.averageUnitCost || 0),
    stockValue: Number(stock.physicalOnHand || 0) * Number(stock.averageUnitCost || 0),
  }));
};

const getLowStockReport = async () => {
  const data = await ProductWarehouseStock.find({ isDeleted: false }) // Enforce soft-delete contract
    .populate("productId", "publicId productName sku inventoryConfig status")
    .populate("warehouseId", "publicId warehouseName warehouseCode");

  return data
    .filter((stock) => {
      const product = stock.productId;
      if (!product || product.isDeleted) return false;
      if (product.status !== "active") return false;
      if (product.inventoryConfig?.trackInventory === false) return false;

      const availableStock = Number(stock.availableStock || 0);
      const reorderLevel = Number(product.inventoryConfig?.reorderLevel || 0);
      
      // Strict rule boundary: must have active stock left, but at or below the reorder point
      return availableStock > 0 && availableStock <= reorderLevel;
    })
    .map((stock) => ({
      product: stock.productId,
      warehouse: stock.warehouseId,
      availableStock: Number(stock.availableStock || 0),
      physicalOnHand: Number(stock.physicalOnHand || 0),
      reorderLevel: Number(stock.productId.inventoryConfig?.reorderLevel || 0),
      minimumStockLevel: Number(stock.productId.inventoryConfig?.minimumStockLevel || 0),
    }));
};

const getOutOfStockReport = async () => {
  const data = await ProductWarehouseStock.find({
    isDeleted: false, // Enforce soft-delete contract
    availableStock: { $lte: 0 },
  })
    .populate("productId", "publicId productName sku inventoryConfig status")
    .populate("warehouseId", "publicId warehouseName warehouseCode");

  return data
    .filter((stock) => 
      stock.productId &&
      !stock.productId.isDeleted &&
      stock.productId.status === "active" &&
      stock.productId.inventoryConfig?.trackInventory !== false
    )
    .map((stock) => ({
      product: stock.productId,
      warehouse: stock.warehouseId,
      physicalOnHand: Number(stock.physicalOnHand || 0),
      reservedStock: Number(stock.reservedStock || 0),
      availableStock: Number(stock.availableStock || 0),
    }));
};


const getInventoryMovementReport = async (query) => {
  const { startDate, endDate } = query;
  const matchStage = { isDeleted: false }; // Enforce soft-delete preprocessing filter contract

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchStage.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.createdAt.$lte = end;
    }
  }

  return await InventoryTransaction.aggregate([
    {
      $match: matchStage,
    },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $lookup: {
        from: "warehouses",
        localField: "warehouseId",
        foreignField: "_id",
        as: "warehouse",
      },
    },
    {
      $unwind: { path: "$product", preserveNullAndEmptyArrays: true },
    },
    {
      $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true },
    },
    // Filter out if the parent product was soft-deleted
    {
      $match: { "product.isDeleted": { $ne: true } }
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        _id: 1,
        product: {
          publicId: "$product.publicId",
          productName: "$product.productName",
          sku: "$product.sku",
        },
        warehouse: {
          publicId: "$warehouse.publicId",
          warehouseName: "$warehouse.warehouseName",
          warehouseCode: "$warehouse.warehouseCode",
        },
        quantity: 1,
        transactionType: 1,
        referenceType: 1,
        referenceId: 1,
        unitCost: 1,
        postedBy: 1,
        createdAt: 1,
      },
    },
  ]);
};


/**
 * Compiles a financial matrix report for independent operational business expenses.
 * Excludes soft-deleted elements and structures data dynamically via multi-stage pipelines.
 */
const getExpenseReport = async (query) => {
  const { period = "daily", startDate, endDate } = query;
  
  const { start, end } = getDateRange({ period, startDate, endDate });

  const matchStage = {
    isDeleted: false, // Strict global soft-delete firewall compliance
    expenseDate: {
      $gte: start,
      $lte: end,
    },
  };

  // Pipeline 1: Global totals execution block
  const [summary] = await Expense.aggregate([
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: 1 },
        totalAmount: { $sum: { $toDouble: "$amount" } }, // Float precision decimal mapping
      },
    },
    {
      $project: {
        _id: 0,
        totalExpenses: 1,
        totalAmount: 1,
      },
    },
  ]);

  // Pipeline 2: Categorised operational cost segmentation block
  const categoryBreakdown = await Expense.aggregate([
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: "$category",
        expenseCount: { $sum: 1 },
        totalAmount: { $sum: { $toDouble: "$amount" } },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        expenseCount: 1,
        totalAmount: 1,
      },
    },
    {
      $sort: {
        totalAmount: -1, // Highlight the highest cash expenditure streams first
      },
    },
  ]);

  return {
    period,
    startDate: start,
    endDate: end,
    summary: summary || {
      totalExpenses: 0,
      totalAmount: 0,
    },
    categoryBreakdown: categoryBreakdown || [],
  };
};


/**
 * Compiles Net Recognized Revenue based on Phase 14 Rule C parameters.
 * Formulas: Net Revenue = Qualifying Gross Sales - Completed Returns/Exchanges Total Amount.
 */
const getRevenueReport = async (query) => {
  const { period = "daily", startDate, endDate } = query;
  const { start, end } = getDateRange({ period, startDate, endDate });

  // 1. Recognized Gross Sales Aggregate Engine
  const saleMatchStage = {
    isDeleted: false,
    status: { $in: REVENUE_SALE_STATUSES },
    saleDate: { $gte: start, $lte: end },
  };

  const [salesSummary] = await Sale.aggregate([
    { $match: saleMatchStage },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        grossRevenue: { $sum: { $toDouble: "$totalAmount" } },
        totalPaid: { $sum: { $toDouble: "$paidAmount" } },
        totalDue: { $sum: { $toDouble: "$dueAmount" } },
      },
    },
    {
      $project: {
        _id: 0,
        totalSales: 1,
        grossRevenue: 1,
        totalPaid: 1,
        totalDue: 1,
      },
    },
  ]);

  // 2. Completed Returns / Exchanges Deductions Aggregate Engine (Uses processedAt tracking)
  const returnMatchStage = {
    isDeleted: false,
    status: SALE_RETURN_STATUS.COMPLETED,
    returnType: { $in: [SALE_RETURN_TYPE.RETURN, SALE_RETURN_TYPE.EXCHANGE] },
    processedAt: { $gte: start, $lte: end },
  };

  const [returnsSummary] = await SaleReturn.aggregate([
    { $match: returnMatchStage },
    {
      $group: {
        _id: null,
        totalReturns: { $sum: 1 },
        totalReturnAmount: { $sum: { $toDouble: "$totalAmount" } },
        returnAmount: {
          $sum: {
            $cond: [
              { $eq: ["$returnType", SALE_RETURN_TYPE.RETURN] },
              { $toDouble: "$totalAmount" },
              0,
            ],
          },
        },
        exchangeAmount: {
          $sum: {
            $cond: [
              { $eq: ["$returnType", SALE_RETURN_TYPE.EXCHANGE] },
              { $toDouble: "$totalAmount" },
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalReturns: 1,
        totalReturnAmount: 1,
        returnAmount: 1,
        exchangeAmount: 1,
      },
    },
  ]);

  // 3. Normalization Safe Guards
  const sales = salesSummary || { totalSales: 0, grossRevenue: 0, totalPaid: 0, totalDue: 0 };
  const returns = returnsSummary || { totalReturns: 0, totalReturnAmount: 0, returnAmount: 0, exchangeAmount: 0 };

  // 4. Net Balancing Matrix Calculations
  const grossRevenue = Number(sales.grossRevenue || 0);
  const totalReturnAmount = Number(returns.totalReturnAmount || 0);
  const netRecognizedRevenue = grossRevenue - totalReturnAmount;

  return {
    period,
    startDate: start,
    endDate: end,
    summary: {
      totalSales: Number(sales.totalSales || 0),
      grossRevenue,
      totalReturns: Number(returns.totalReturns || 0),
      totalReturnAmount,
      returnAmount: Number(returns.returnAmount || 0),
      exchangeAmount: Number(returns.exchangeAmount || 0),
      netRecognizedRevenue,
      totalPaid: Number(sales.totalPaid || 0),
      totalDue: Number(sales.totalDue || 0),
    },
  };
};


export const ReportService = {
  getSalesReport,
  getPurchaseReport,
  getCurrentStockReport,
  getLowStockReport,
  getOutOfStockReport,
  getInventoryMovementReport,
  getExpenseReport,
  getRevenueReport,
};
