import mongoose from "mongoose";

import HTTP_STATUS from "../../constants/httpStatus.js";
import ApiError from "../../shared/ApiError.js";

import Customer from "../customers/customer.model.js";
import { Sale } from "../sales/sale.model.js";
import { SaleReturn } from "../sales/saleReturn.model.js";

import ReturnFinancialReconciliation from "./returnFinancialReconciliation.model.js";
import AccountsPayable from "./accountsPayable.model.js"; // AP model import
import Supplier from "../suppliers/supplier.model.js"; // Supplier model import
import { PurchaseReturn } from "../purchases/purchaseReturn.model.js"; // Purchase Return model import

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

/**
 * Validates the authenticated actor context.
 */
const validateWorkflowActor = (reqUser) => {
  if (!reqUser?.id) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Authenticated user identity is required."
    );
  }
  return reqUser.id;
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

/* ============================================================
 * PHASE 14.1.5 — INTERNAL SUPPLIER BACKEND HELPERS
 * ============================================================
 */

/**
 * Locates the matching Accounts Payable record linked to the purchase return.
 */
const getAccountsPayableForPurchaseReturn = async (purchaseReturn, session) => {
  // Traceability path: PurchaseReturn -> GoodsReceipt/PurchaseInvoice -> AccountsPayable
  const apLiability = await AccountsPayable.findOne({
    purchaseInvoiceId: purchaseReturn.goodsReceiptId, // Adjust parameter mapping to your core key definitions
    supplierId: purchaseReturn.supplierId,
  }).session(session);

  if (!apLiability) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Accounts payable liability for the purchase return was not found."
    );
  }
  return apLiability;
};

/**
 * Validates supplier existence and state.
 */
const getActiveSupplier = async (supplierId, session) => {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    isDeleted: false,
  }).session(session);

  if (!supplier) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Supplier record not found."
    );
  }
  if (supplier.status !== "active") {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Financial reconciliation cannot be posted for an inactive supplier."
    );
  }
  return supplier;
};

/**
 * Mathematical formula engine for pure purchase RETURN paths.
 */
const calculateSupplierReturnReconciliation = ({ purchaseReturn, apLiability }) => {
  const returnAmount = roundMoney(Number(purchaseReturn.totalAmount));
  const previousOutstanding = roundMoney(Number(apLiability.outstandingAmount));
  const previousPayable = roundMoney(Number(apLiability.payableAmount));
  const previousPaid = roundMoney(Number(apLiability.paidAmount));

  // Clamps liability drops to protect outstandingAmount >= 0 invariants
  const payableReduction = Math.min(returnAmount, previousOutstanding);
  const excessSupplierCredit = roundMoney(returnAmount - payableReduction);

  const resultingPayable = roundMoney(previousPayable - payableReduction);
  const resultingOutstanding = roundMoney(Math.max(0, resultingPayable - previousPaid)); // Recalculate liability delta

  return {
    returnAmount,
    replacementAmount: 0,
    previousBalance: previousOutstanding,
    adjustmentAmount: payableReduction,
    balanceAdjustment: -payableReduction,
    resultingBalance: resultingOutstanding,
    supplierCreditAmount: excessSupplierCredit,
    resultingPayable,
    resultingPaid: previousPaid,
    resultingOutstanding,
    direction:
      excessSupplierCredit > 0
        ? RETURN_FINANCIAL_DIRECTION.SUPPLIER_REFUND
        : RETURN_FINANCIAL_DIRECTION.SUPPLIER_CREDIT,
  };
};

/**
 * Line total aggregate calculation for purchase replacement records.
 */
const calculatePurchaseReplacementAmount = (purchaseReturn) => {
  return roundMoney(
    (purchaseReturn.replacementItems || []).reduce((sum, item) => {
      return sum + Number(item.lineTotal || 0);
    }, 0)
  );
};

/**
 * Mathematical formula engine for purchase EXCHANGE paths.
 */
const calculateSupplierExchangeReconciliation = ({ purchaseReturn, apLiability }) => {
  const returnAmount = roundMoney(Number(purchaseReturn.totalAmount));
  const replacementAmount = calculatePurchaseReplacementAmount(purchaseReturn);
  const previousOutstanding = roundMoney(Number(apLiability.outstandingAmount));
  const previousPayable = roundMoney(Number(apLiability.payableAmount));
  const previousPaid = roundMoney(Number(apLiability.paidAmount));
  const difference = roundMoney(replacementAmount - returnAmount);

  if (difference > 0) {
    // Replacement costs more: additional business liability generated
    const resultingPayable = roundMoney(previousPayable + difference);
    const resultingOutstanding = roundMoney(resultingPayable - previousPaid);
    return {
        returnAmount,
        replacementAmount,
        previousBalance: previousOutstanding,
        adjustmentAmount: difference,
        balanceAdjustment: difference,
        resultingBalance: resultingOutstanding,
        supplierCreditAmount: 0,
        resultingPayable,
        resultingPaid: previousPaid,
        resultingOutstanding,
        direction: RETURN_FINANCIAL_DIRECTION.EXCHANGE_ADJUSTMENT,
    };
}

if (difference < 0) {
    // Returned item is worth more: supplier gives credit delta
    const supplierCredit = Math.abs(difference);
    const payableReduction = Math.min(supplierCredit, previousOutstanding);
    const excessSupplierCredit = roundMoney(supplierCredit - payableReduction);
    
    const resultingPayable = roundMoney(previousPayable - payableReduction);
    const resultingOutstanding = roundMoney(Math.max(0, resultingPayable - previousPaid));
    
    return {
        returnAmount,
        replacementAmount,
        previousBalance: previousOutstanding,
        adjustmentAmount: supplierCredit,
        balanceAdjustment: -payableReduction,
        resultingBalance: resultingOutstanding,
        supplierCreditAmount: excessSupplierCredit,
        resultingPayable,resultingPaid: previousPaid,
        resultingOutstanding,direction: RETURN_FINANCIAL_DIRECTION.EXCHANGE_ADJUSTMENT,
    };
}

// Equal exchange value
return {
    returnAmount,
    replacementAmount,
    previousBalance: previousOutstanding,
    adjustmentAmount: 0,
    balanceAdjustment: 0,
    resultingBalance: previousOutstanding,
    supplierCreditAmount: 0,
    resultingPayable: previousPayable,
    resultingPaid: previousPaid,
    resultingOutstanding: previousOutstanding,
    direction: RETURN_FINANCIAL_DIRECTION.EXCHANGE_ADJUSTMENT,
};
};

/* 
============================================================
    PUBLIC RECONCILIATION API WORKFLOW TRANSACTION ENTRY POINTS
============================================================
*/

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
        const saleReturn = await getCompletedSaleReturn(returnPublicId, session);
        const existingReconciliation = await ReturnFinancialReconciliation.findOne({
            sourceType: RETURN_FINANCIAL_SOURCE.SALES_RETURN,
            sourceReturnId: saleReturn._id,
        }).session(session);
        
        if (existingReconciliation) {
            throw new ApiError(
                HTTP_STATUS.CONFLICT,
                "Financial reconciliation has already been posted for this sales return."
            );
        }
        
        const sale = await getOriginalSale(saleReturn, session);
        const customer = await getActiveCustomer(saleReturn.customerId, session);
        let financialResult;
        
        if (saleReturn.returnType === RETURN_FINANCIAL_TYPE.RETURN) {
            financialResult = calculateCustomerReturnReconciliation({ saleReturn, customer });
        } else {
            financialResult = calculateCustomerExchangeReconciliation({ saleReturn, customer });
        }
        
        customer.currentBalance = financialResult.resultingBalance;
        customer.totalReturnedAmount = roundMoney(
            Number(customer.totalReturnedAmount || 0) + financialResult.returnAmount
        );
        customer.updatedBy = reqUser.id;
        await customer.save({ session });
        
        const reconciliationNumber = await generateReconciliationNumber(session);
        
        const reconciliation = new ReturnFinancialReconciliation({
            publicId: generatePublicId("RFR"),
            reconciliationNumber,
            sourceType: RETURN_FINANCIAL_SOURCE.SALES_RETURN,
            sourceReturnId: saleReturn._id,
            sourceReturnPublicId: saleReturn.publicId,
            sourceReturnNumber: saleReturn.returnNumber,
            returnType: saleReturn.returnType,
            saleId: sale._id,
            purchaseId: null,
            customerId: customer._id,
            supplierId: null,
            direction: financialResult.direction,
            returnAmount: financialResult.returnAmount,
            replacementAmount: financialResult.replacementAmount,
            adjustmentAmount: financialResult.adjustmentAmount,
            previousBalance: financialResult.previousBalance,
            balanceAdjustment: financialResult.balanceAdjustment,
            resultingBalance: financialResult.resultingBalance,
            status: "POSTED",
            reconciledAt: new Date(),
            reconciledBy: reqUser.id,
            remarks: `Financial reconciliation for sales return ${saleReturn.returnNumber}.`,
        });
        
        await reconciliation.save({ session });
        await ActivityLogService.logActivity({
            user: reqUser.id,
            action: "FINANCIAL_RECONCILIATION",
            module: "ACCOUNTING",
            entityId: reconciliation._id,
            description: `Customer financial reconciliation posted for sales return ${saleReturn.returnNumber}.`,
            metadata: {
                reconciliationPublicId: reconciliation.publicId,
                reconciliationNumber,
                saleReturnPublicId: saleReturn.publicId,
                returnNumber: saleReturn.returnNumber,
                returnType: saleReturn.returnType,
                saleId: sale._id,
                customerId: customer._id,
                returnAmount: financialResult.returnAmount,
                replacementAmount: financialResult.replacementAmount,
                balanceAdjustment: financialResult.balanceAdjustment,
                previousBalance: financialResult.previousBalance,
                resultingBalance: financialResult.resultingBalance,
                refundAmount: financialResult.refundAmount,
            },
            session,
        });
        
        await session.commitTransaction();
        
        return {
            reconciliation,
            customerBalance: customer.currentBalance,
            refundAmount: financialResult.refundAmount,
        };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};

/**
 * Main Supplier Reconciliation Transaction Pipeline (Phase 14.1.5)
 * Tracks completed procurement returns, enforces idempotency, updates AccountsPayable
 * states, alters Supplier payables, and appends audit logs atomically.
 */

export const reconcileSupplierReturn = async (returnPublicId, reqUser) => {
    validateWorkflowActor(reqUser); // Ensure authentication layer check
    
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // 1. Find and validate completed physical Purchase Return
        const purchaseReturn = await PurchaseReturn.findOne({
            publicId: returnPublicId,
            isDeleted: false,
        }).session(session);
        
        if (!purchaseReturn) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, "Purchase return record not found.");
        }
        if (purchaseReturn.status !== "COMPLETED") {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                "Supplier financial reconciliation is allowed only after physical return processing is completed."
            );
        }
        
        // 2. Strict accounting-level idempotency protection gate
        const existingReconciliation = await ReturnFinancialReconciliation.findOne({
            sourceType: RETURN_FINANCIAL_SOURCE.PURCHASE_RETURN,
            sourceReturnId: purchaseReturn._id,
        }).session(session);
        
        if (existingReconciliation) {
            throw new ApiError(
                HTTP_STATUS.CONFLICT,
                "Financial reconciliation has already been posted for this purchase return."
            );
        }
        
        // 3. Load master Supplier and matching Accounts Payable target record
        const supplier = await getActiveSupplier(purchaseReturn.supplierId, session);
        const apLiability = await getAccountsPayableForPurchaseReturn(purchaseReturn, session);
        
        // 4. Calculate authoritative accounting results
        let financialResult;
        if (purchaseReturn.returnType === RETURN_FINANCIAL_TYPE.RETURN) {
            financialResult = calculateSupplierReturnReconciliation({ purchaseReturn, apLiability });
        } else {
            financialResult = calculateSupplierExchangeReconciliation({ purchaseReturn, apLiability });
        }
        
        // 5. Update parent AccountsPayable document fields and lifecycle status safely
        apLiability.payableAmount = 
        mongoose.Types.Decimal128.fromString(financialResult.resultingPayable.toFixed(2));
        apLiability.paidAmount = 
        mongoose.Types.Decimal128.fromString(financialResult.resultingPaid.toFixed(2));
        apLiability.outstandingAmount = 
        mongoose.Types.Decimal128.fromString(financialResult.resultingOutstanding.toFixed(2));
        
        if (financialResult.resultingOutstanding === 0) {
            apLiability.status = "PAID";
        } else if (financialResult.resultingPaid > 0) {
            apLiability.status = "PARTIALLY_PAID";
        } else {apLiability.status = "OPEN";
        }
        await apLiability.save({ session });
        
        // 6. Update Supplier liability aggregates safely clamping floors >= 0
        const previousSupplierPayable = roundMoney(Number(supplier.currentPayable || 0));
        const newSupplierPayable = Math.max(0, roundMoney(previousSupplierPayable + 
            financialResult.balanceAdjustment));
            supplier.currentPayable = newSupplierPayable;
            await supplier.save({ session });
            
        // 7. Generate matching sequential financial block numbers
        const reconciliationNumber = await generateReconciliationNumber(session);
        
        // 8. Instantiate and persist the immutable reconciliation event
        const reconciliation = new ReturnFinancialReconciliation({
            publicId: generatePublicId("RFR"),
            reconciliationNumber,
            sourceType: RETURN_FINANCIAL_SOURCE.PURCHASE_RETURN,
            sourceReturnId: purchaseReturn._id,
            sourceReturnPublicId: purchaseReturn.publicId,
            sourceReturnNumber: purchaseReturn.returnNumber,
            returnType: purchaseReturn.returnType,
            saleId: null,
            purchaseId: purchaseReturn.purchaseId,
            customerId: null,
            supplierId: supplier._id,
            direction: financialResult.direction,
            returnAmount: financialResult.returnAmount,
            replacementAmount: financialResult.replacementAmount,
            adjustmentAmount: financialResult.adjustmentAmount,
            previousBalance: financialResult.previousBalance,
            balanceAdjustment: financialResult.balanceAdjustment,
            resultingBalance: financialResult.resultingBalance,
            status: "POSTED",
            reconciledAt: new Date(),
            reconciledBy: reqUser.id,
            remarks: `Financial reconciliation for purchase return ${purchaseReturn.returnNumber}.`,
        });
        await reconciliation.save({ session });
        
        // 9. Emit transaction activity log
        await ActivityLogService.logActivity({
            user: reqUser.id,
            action: "FINANCIAL_RECONCILIATION",
            module: "ACCOUNTING",
            entityId: reconciliation._id,
            description: `Supplier financial reconciliation posted for purchase return ${purchaseReturn.returnNumber}.`,
            metadata: {
                reconciliationPublicId: reconciliation.publicId,
                reconciliationNumber,
                purchaseReturnPublicId: purchaseReturn.publicId,
                returnNumber: purchaseReturn.returnNumber,
                returnType: purchaseReturn.returnType,
                purchaseId: purchaseReturn.purchaseId,
                supplierId: supplier._id,
                returnAmount: financialResult.returnAmount,
                replacementAmount: financialResult.replacementAmount,
                balanceAdjustment: financialResult.balanceAdjustment,
                previousBalance: financialResult.previousBalance,
                resultingBalance: financialResult.resultingBalance,
                supplierCreditAmount: financialResult.supplierCreditAmount,
            },
            session,
        });
        
        await session.commitTransaction(); // Commit changes atomically
        
        return {
            reconciliation,
            supplierPayable: supplier.currentPayable,
            apOutstanding: financialResult.resultingOutstanding,
            supplierCreditAmount: financialResult.supplierCreditAmount,
        };
    } catch (error) {
        await session.abortTransaction(); // Full rollback on any component failure
        throw error;
    } finally {
        await session.endSession();
    }
};

export const ReturnFinancialReconciliationService = {
    reconcileCustomerReturn,
    reconcileSupplierReturn,
};
