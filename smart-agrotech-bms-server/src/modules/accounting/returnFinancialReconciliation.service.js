import mongoose from "mongoose";

import HTTP_STATUS from "../../constants/httpStatus.js";
import ApiError from "../../shared/ApiError.js";

import Customer from "../customers/customer.model.js";
import { Sale } from "../sales/sale.model.js";
import { SaleReturn } from "../sales/saleReturn.model.js";

import ReturnFinancialReconciliation from "./returnFinancialReconciliation.model.js";

import {
  RETURN_FINANCIAL_SOURCE,
  RETURN_FINANCIAL_TYPE,
  RETURN_FINANCIAL_DIRECTION,
} from "./returnFinancialReconciliation.constants.js";

import generatePublicId from "../../utils/generatePublicId.js";
import Counter from "../../shared/schemas/counter.model.js";

import { ActivityLogService } from "../activity-logs/activityLog.service.js";


const roundMoney = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};


const generateReconciliationNumber = async (session) => {
  const currentYear = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    {
      key: `return-financial-reconciliation-${currentYear}`,
    },
    {
      $inc: {
        sequence: 1,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    }
  );

  return `RFR-${currentYear}-${String(counter.sequence).padStart(6, "0")}`;
};

const getCompletedSaleReturn = async (
  returnPublicId,
  session
) => {
  const saleReturn = await SaleReturn.findOne({
    publicId: returnPublicId,
    isDeleted: false,
  }).session(session);

  if (!saleReturn) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Sales return record not found."
    );
  }

  if (saleReturn.status !== "COMPLETED") {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Financial reconciliation is allowed only after physical return processing is completed."
    );
  }

  if (saleReturn.returnType !== RETURN_FINANCIAL_TYPE.RETURN &&
      saleReturn.returnType !== RETURN_FINANCIAL_TYPE.EXCHANGE) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Unsupported sales return type for financial reconciliation."
    );
  }

  return saleReturn;
};

const getActiveCustomer = async (customerId, session) => {
  const customer = await Customer.findOne({
    _id: customerId,
    isDeleted: false,
  }).session(session);

  if (!customer) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Customer record not found."
    );
  }

  if (customer.status !== "active") {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Financial reconciliation cannot be posted for an inactive customer."
    );
  }

  return customer;
};

const getOriginalSale = async (saleReturn, session) => {
  const sale = await Sale.findOne({
    _id: saleReturn.saleId,
    isDeleted: false,
  }).session(session);

  if (!sale) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Original sale record not found."
    );
  }

  if (sale.customerId.toString() !== saleReturn.customerId.toString()) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "Sales return customer does not match the original sale."
    );
  }

  return sale;
};

const calculateCustomerReturnReconciliation = ({
  saleReturn,
  customer,
}) => {
  const returnAmount = roundMoney(
    Number(saleReturn.totalAmount)
  );

  const previousBalance = roundMoney(
    Number(customer.currentBalance || 0)
  );

  const balanceReduction = Math.min(
    returnAmount,
    previousBalance
  );

  const refundAmount = roundMoney(
    returnAmount - balanceReduction
  );

  const resultingBalance = roundMoney(
    previousBalance - balanceReduction
  );

  return {
    returnAmount,
    replacementAmount: 0,
    adjustmentAmount: balanceReduction,
    previousBalance,
    balanceAdjustment: -balanceReduction,
    resultingBalance,
    refundAmount,
    direction:
      refundAmount > 0
        ? RETURN_FINANCIAL_DIRECTION.CUSTOMER_REFUND
        : RETURN_FINANCIAL_DIRECTION.CUSTOMER_CREDIT,
  };
};

const calculateReplacementAmount = (saleReturn) => {
  return roundMoney(
    (saleReturn.replacementItems || []).reduce(
      (sum, item) => {
        return sum + Number(item.lineTotal || 0);
      },
      0
    )
  );
};

const calculateCustomerExchangeReconciliation = ({
  saleReturn,
  customer,
}) => {
  const returnAmount = roundMoney(
    Number(saleReturn.totalAmount)
  );

  const replacementAmount = calculateReplacementAmount(
    saleReturn
  );

  const previousBalance = roundMoney(
    Number(customer.currentBalance || 0)
  );

  const difference = roundMoney(
    replacementAmount - returnAmount
  );

  if (difference > 0) {
    // Replacement is more expensive.
    const resultingBalance = roundMoney(
      previousBalance + difference
    );

    return {
      returnAmount,
      replacementAmount,
      adjustmentAmount: difference,
      previousBalance,
      balanceAdjustment: difference,
      resultingBalance,
      refundAmount: 0,
      direction:
        RETURN_FINANCIAL_DIRECTION.EXCHANGE_ADJUSTMENT,
    };
  }

  if (difference < 0) {
    // Returned item is more valuable.
    const creditAmount = Math.abs(difference);

    const balanceReduction = Math.min(
      creditAmount,
      previousBalance
    );

    const refundAmount = roundMoney(
      creditAmount - balanceReduction
    );

    const resultingBalance = roundMoney(
      previousBalance - balanceReduction
    );

    return {
      returnAmount,
      replacementAmount,
      adjustmentAmount: creditAmount,
      previousBalance,
      balanceAdjustment: -balanceReduction,
      resultingBalance,
      refundAmount,
      direction:
        RETURN_FINANCIAL_DIRECTION.EXCHANGE_ADJUSTMENT,
    };
  }

  return {
    returnAmount,
    replacementAmount,
    adjustmentAmount: 0,
    previousBalance,
    balanceAdjustment: 0,
    resultingBalance: previousBalance,
    refundAmount: 0,
    direction:
      RETURN_FINANCIAL_DIRECTION.EXCHANGE_ADJUSTMENT,
  };
};

export const reconcileCustomerReturn = async (
  returnPublicId,
  reqUser
) => {
  if (!reqUser?.id) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Authenticated user is required."
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Get completed physical return
    const saleReturn = await getCompletedSaleReturn(
      returnPublicId,
      session
    );

    // 2. Idempotency protection
    const existingReconciliation =
      await ReturnFinancialReconciliation.findOne({
        sourceType:
          RETURN_FINANCIAL_SOURCE.SALES_RETURN,
        sourceReturnId: saleReturn._id,
      }).session(session);

    if (existingReconciliation) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Financial reconciliation has already been posted for this sales return."
      );
    }

    // 3. Validate original Sale
    const sale = await getOriginalSale(
      saleReturn,
      session
    );

    // 4. Validate Customer
    const customer = await getActiveCustomer(
      saleReturn.customerId,
      session
    );

    // 5. Calculate authoritative financial effect
    let financialResult;

    if (
      saleReturn.returnType ===
      RETURN_FINANCIAL_TYPE.RETURN
    ) {
      financialResult =
        calculateCustomerReturnReconciliation({
          saleReturn,
          customer,
        });
    } else {
      financialResult =
        calculateCustomerExchangeReconciliation({
          saleReturn,
          customer,
        });
    }

    // 6. Update customer balance atomically
    customer.currentBalance =
      financialResult.resultingBalance;

    customer.totalReturnedAmount = roundMoney(
      Number(customer.totalReturnedAmount || 0) +
      financialResult.returnAmount
    );

    customer.updatedBy = reqUser.id;

    await customer.save({ session });

    // 7. Generate reconciliation number
    const reconciliationNumber =
      await generateReconciliationNumber(session);

    // 8. Create immutable reconciliation event
    const reconciliation =
      new ReturnFinancialReconciliation({
        publicId: generatePublicId("RFR"),
        reconciliationNumber,

        sourceType:
          RETURN_FINANCIAL_SOURCE.SALES_RETURN,

        sourceReturnId: saleReturn._id,
        sourceReturnPublicId: saleReturn.publicId,
        sourceReturnNumber: saleReturn.returnNumber,

        returnType: saleReturn.returnType,

        saleId: sale._id,
        purchaseId: null,

        customerId: customer._id,
        supplierId: null,

        direction:
          financialResult.direction,

        returnAmount:
          financialResult.returnAmount,

        replacementAmount:
          financialResult.replacementAmount,

        adjustmentAmount:
          financialResult.adjustmentAmount,

        previousBalance:
          financialResult.previousBalance,

        balanceAdjustment:
          financialResult.balanceAdjustment,

        resultingBalance:
          financialResult.resultingBalance,

        status: "POSTED",

        reconciledAt: new Date(),
        reconciledBy: reqUser.id,

        remarks:
          `Financial reconciliation for sales return ${saleReturn.returnNumber}.`,
      });

    await reconciliation.save({ session });

    // 9. Audit trail
    await ActivityLogService.logActivity({
      user: reqUser.id,
      action: "FINANCIAL_RECONCILIATION",
      module: "ACCOUNTING",
      entityId: reconciliation._id,
      description:
        `Customer financial reconciliation posted for sales return ${saleReturn.returnNumber}.`,
      metadata: {
        reconciliationPublicId:
          reconciliation.publicId,

        reconciliationNumber,

        saleReturnPublicId:
          saleReturn.publicId,

        returnNumber:
          saleReturn.returnNumber,

        returnType:
          saleReturn.returnType,

        saleId:
          sale._id,

        customerId:
          customer._id,

        returnAmount:
            financialResult.returnAmount,

        replacementAmount:
            financialResult.replacementAmount,

        balanceAdjustment:
            financialResult.balanceAdjustment,

        previousBalance:
            financialResult.previousBalance,
        
        resultingBalance:
            financialResult.resultingBalance,

        refundAmount:
            financialResult.refundAmount,
    },
    session,
});

await session.commitTransaction();
return {
    reconciliation,
    customerBalance:
        customer.currentBalance,
    refundAmount:
        financialResult.refundAmount,
    };
} catch (error) {
    await session.abortTransaction();
    throw error;
} finally {
    await session.endSession();
}
};

export const ReturnFinancialReconciliationService = {
    reconcileCustomerReturn,
};