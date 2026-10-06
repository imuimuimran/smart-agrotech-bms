import mongoose from "mongoose";
import { Sale } from "../sales/sale.model.js";
import { SaleReturn } from "../sales/saleReturn.model.js";
import { SALE_STATUS } from "../sales/sale.constants.js";
import { SALE_RETURN_STATUS, SALE_RETURN_TYPE } from "../sales/saleReturn.constants.js";
import Customer from "../customers/customer.model.js";
import { AccountsPayable } from "../purchases/accountsPayable.model.js";
import Supplier from "../suppliers/supplier.model.js";
import { Purchase } from "../purchases/purchase.model.js";
import Product from "../products/product.model.js";
import { ProductWarehouseStock } from "../inventory/productWarehouseStock.model.js";
import { InventoryTransaction } from "../purchases/inventoryTransaction.model.js";
import { getDateRange } from "./report.utils.js";
import { REPORTABLE_PURCHASE_STATUSES } from "./report.constants.js";
import { Expense } from "../expenses/expense.model.js";

const REVENUE_SALE_STATUSES = [
  SALE_STATUS.CONFIRMED,
  SALE_STATUS.PARTIALLY_RECEIVED,
  SALE_STATUS.RECEIVED,
  SALE_STATUS.PARTIAL_PAID,
  SALE_STATUS.PAID,
  SALE_STATUS.RETURNED,
  SALE_STATUS.COMPLETED,
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

/**
 * Generates an analytical Profit and Loss statement for a designated period scope.
 * Computes Net Revenue, Weighted Average Cost of Goods Sold (COGS), Gross Margins, and Net Profits.
 */
const getProfitLossReport = async (query) => {
  const { period = "daily", startDate, endDate } = query;
  const { start, end } = getDateRange({ period, startDate, endDate });

  // ============================================================
  // 1. SALES REVENUE + COST OF GOODS SOLD (COGS) AGGREGATION
  // ============================================================
  const [salesSummary] = await Sale.aggregate([
    {
      $match: {
        isDeleted: false,
        status: { $in: REVENUE_SALE_STATUSES },
        saleDate: { $gte: start, $lte: end },
      },
    },
    { $unwind: "$products" },
    {
      $group: {
        _id: null,
        grossRevenue: { $sum: { $toDouble: "$products.lineTotal" } },
        grossCOGS: {
          $sum: {
            $multiply: [
              { $toDouble: "$products.quantity" },
              { $toDouble: "$products.unitCost" },
            ],
          },
        },
        totalSales: { $addToSet: "$_id" },
      },
    },
    {
      $project: {
        _id: 0,
        grossRevenue: 1,
        grossCOGS: 1,
        totalSales: { $size: "$totalSales" },
      },
    },
  ]);

  // ============================================================
  // 2. COMPLETED RETURNS / EXCHANGES COST SNAPSHOTS AGGREGATION
  // ============================================================
  const [returnSummary] = await SaleReturn.aggregate([
    {
      $match: {
        isDeleted: false,
        status: SALE_RETURN_STATUS.COMPLETED,
        returnType: { $in: [SALE_RETURN_TYPE.RETURN, SALE_RETURN_TYPE.EXCHANGE] },
        processedAt: { $gte: start, $lte: end },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: null,
        returnRevenue: { $sum: { $toDouble: "$items.lineTotal" } },
        returnedCOGS: {
          $sum: {
            $multiply: [
              { $toDouble: "$items.returnQuantity" },
              { $toDouble: "$items.unitCost" },
            ],
          },
        },
        totalReturns: { $addToSet: "$_id" },
      },
    },
    {
      $project: {
        _id: 0,
        returnRevenue: 1,
        returnedCOGS: 1,
        totalReturns: { $size: "$totalReturns" },
      },
    },
  ]);

  // ============================================================
  // 3. OPERATING EXPENSES AGGREGATION
  // ============================================================
  const [expenseSummary] = await Expense.aggregate([
    {
      $match: {
        isDeleted: false,
        expenseDate: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: 1 },
        operatingExpenses: { $sum: { $toDouble: "$amount" } },
      },
    },
    {
      $project: {
        _id: 0,
        totalExpenses: 1,
        operatingExpenses: 1,
      },
    },
  ]);

  // ============================================================
  // 4. NORMALIZE EMPTY DATA MATRICES
  // ============================================================
  const sales = salesSummary || { totalSales: 0, grossRevenue: 0, grossCOGS: 0 };
  const returns = returnSummary || { totalReturns: 0, returnRevenue: 0, returnedCOGS: 0 };
  const expenses = expenseSummary || { totalExpenses: 0, operatingExpenses: 0 };

  // ============================================================
  // 5. FINANCIAL STRUCTURAL CALCULATIONS
  // ============================================================
  const grossRevenue = Number(sales.grossRevenue || 0);
  const returnRevenue = Number(returns.returnRevenue || 0);
  const netRevenue = grossRevenue - returnRevenue;

  const grossCOGS = Number(sales.grossCOGS || 0);
  const returnedCOGS = Number(returns.returnedCOGS || 0);
  const netCOGS = grossCOGS - returnedCOGS;

  const grossProfit = netRevenue - netCOGS;
  const operatingExpenses = Number(expenses.operatingExpenses || 0);
  const netProfit = grossProfit - operatingExpenses;

  return {
    period,
    startDate: start,
    endDate: end,
    summary: {
      totalSales: Number(sales.totalSales || 0),
      totalReturns: Number(returns.totalReturns || 0),
      grossRevenue,
      returnRevenue,
      netRevenue,
      grossCOGS,
      returnedCOGS,
      netCOGS,
      grossProfit,
      totalExpenses: Number(expenses.totalExpenses || 0),
      operatingExpenses,
      netProfit,
    },
  };
};


/**
 * Generates an outstanding Customer Due Report with summary matrices.
 * Relies directly on the atomically synchronized customer balance states.
 */
const getCustomerDueReport = async (query = {}) => {
  const { search, minDue, maxDue } = query;

  // 1. Establish structural base boundaries (Only active balances > 0)
  const matchStage = {
    isDeleted: false,
    currentBalance: { $gt: 0 },
  };

  if (minDue !== undefined && minDue !== "") {
    matchStage.currentBalance.$gte = Number(minDue);
  }
  if (maxDue !== undefined && maxDue !== "") {
    matchStage.currentBalance.$lte = Number(maxDue);
  }

  // 2. Formulate textual regex stage matches if matching criteria is submitted
  const searchMatchCriteria = [];
  if (search && search.trim() !== "") {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    searchMatchCriteria.push({
      $match: {
        $or: [
          { name: searchRegex },
          { companyName: searchRegex },
          { phone: searchRegex },
          { email: searchRegex },
        ],
      },
    });
  }

  // 3. Assemble and execute the high-performance aggregate summary statement pipeline
  const summaryPipeline = [
    { $match: matchStage },
    ...searchMatchCriteria,
    {
      $group: {
        _id: null,
        totalCustomersWithDue: { $sum: 1 },
        totalOutstandingDue: { $sum: { $toDouble: "$currentBalance" } },
      },
    },
    {
      $project: {
        _id: 0,
        totalCustomersWithDue: 1,
        totalOutstandingDue: 1,
      },
    },
  ];

  const [summaryResult] = await Customer.aggregate(summaryPipeline);

  // 4. Construct final synchronized dataset query execution block
  let finalQueryConditions = { ...matchStage };
  if (search && search.trim() !== "") {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    finalQueryConditions.$or = [
      { name: searchRegex },
      { companyName: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
    ];
  }

  const customersList = await Customer.find(finalQueryConditions)
    .select(
      "publicId name companyName phone email currentBalance creditLimit paymentTerms lastPaymentDate"
    )
    .sort({ currentBalance: -1 }); // Rank highest debts first

  return {
    summary: summaryResult || {
      totalCustomersWithDue: 0,
      totalOutstandingDue: 0,
    },
    customers: customersList || [],
  };
};


/**
 * Generates an aggregated Supplier Due Liability Report using the Accounts Payable sub-ledger.
 * Traces aging schedules, tracks totals, and maps actual supplier field properties.
 */
const getSupplierDueReport = async (query = {}) => {
  const { supplierId, search = "", overdueOnly = false } = query;

  // 1. Initialize match filtering criteria (Enforce active soft-delete firewalls)
  const matchStage = {
    isDeleted: false,
    status: { $ne: "PAID" },
  };

  // Optional supplier filter boundary checking
  if (supplierId) {
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return {
        summary: {
          totalSuppliersWithDue: 0,
          totalPayableAmount: 0,
          totalPaidAmount: 0,
          totalOutstandingDue: 0,
          totalOverdueAmount: 0,
        },
        suppliers: [],
      };
    }
    matchStage.supplierId = new mongoose.Types.ObjectId(supplierId);
  }

  // Handle explicit aging overdue query scopes
  if (overdueOnly === true || overdueOnly === "true") {
    matchStage.dueDate = { $lt: new Date() };
  }

  // 2. Build out high-performance pipeline array maps dynamically
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: "$supplierId",
        totalPayableAmount: { $sum: { $toDouble: "$payableAmount" } },
        totalPaidAmount: { $sum: { $toDouble: "$paidAmount" } },
        totalOutstandingDue: { $sum: { $toDouble: "$outstandingAmount" } },
        invoiceCount: { $sum: 1 },
        overdueAmount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", new Date()] },
                  { $ne: ["$status", "PAID"] },
                ],
              },
              { $toDouble: "$outstandingAmount" },
              0,
            ],
          },
        },
        overdueInvoiceCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", new Date()] },
                  { $ne: ["$status", "PAID"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: "suppliers",
        localField: "_id",
        foreignField: "_id",
        as: "supplierInfo",
      },
    },
    { $unwind: "$supplierInfo" },
    {
      $project: {
        _id: 0,
        supplierId: "$_id",
        publicId: "$supplierInfo.publicId",
        supplierName: "$supplierInfo.supplierName", // Corrected mapping property hook
        supplierCode: "$supplierInfo.supplierCode",
        companyName: "$supplierInfo.companyName",
        email: "$supplierInfo.email",
        phone: "$supplierInfo.phone",
        totalPayableAmount: 1,
        totalPaidAmount: 1,
        outstandingAmount: "$totalOutstandingDue",
        invoiceCount: 1,
        overdueAmount: 1,
        overdueInvoiceCount: 1,
      },
    },
  ];

  // Dynamically push text filter stage to prevent pipeline syntax errors
  if (search && search.trim() !== "") {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    pipeline.push({
      $match: {
        $or: [
          { supplierName: searchRegex },
          { companyName: searchRegex },
          { supplierCode: searchRegex },
          { email: searchRegex },
        ],
      },
    });
  }

  // Sort by highest liabilities first
  pipeline.push({ $sort: { outstandingAmount: -1 } });

  const aggregation = await AccountsPayable.aggregate(pipeline);

  // 3. Compile high-level operational liability counters
  const summary = aggregation.reduce(
    (accumulator, supplier) => {
      accumulator.totalSuppliersWithDue += 1;
      accumulator.totalPayableAmount += supplier.totalPayableAmount || 0;
      accumulator.totalPaidAmount += supplier.totalPaidAmount || 0;
      accumulator.totalOutstandingDue += supplier.outstandingAmount || 0;
      accumulator.totalOverdueAmount += supplier.overdueAmount || 0;
      return accumulator;
    },
    {
      totalSuppliersWithDue: 0,
      totalPayableAmount: 0,
      totalPaidAmount: 0,
      totalOutstandingDue: 0,
      totalOverdueAmount: 0,
    }
  );

  return {
    summary,
    suppliers: aggregation || [],
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
  getProfitLossReport,
  getCustomerDueReport,
  getSupplierDueReport,
};
