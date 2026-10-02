import { Sale } from "../sales/sale.model.js";
import { Purchase } from "../purchases/purchase.model.js";
import { getDateRange } from "./report.utils.js";
import { REPORTABLE_PURCHASE_STATUSES } from "./report.constants.js";

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


export const ReportService = {
  getSalesReport,
  getPurchaseReport,
};
