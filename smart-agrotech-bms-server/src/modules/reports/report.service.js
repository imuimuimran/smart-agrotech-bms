import { Sale } from "../sales/sale.model.js";
import { getDateRange } from "./report.utils.js";

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

export const ReportService = {
  getSalesReport,
};
