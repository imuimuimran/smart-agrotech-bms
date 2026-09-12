import mongoose from 'mongoose';
import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js"; 
import { Sale } from './sale.model.js';
import { SalePayment } from './salePayment.model.js';
import { 
  SALE_STATUS,
  PAYMENT_METHODS, 
} from './sale.constants.js';
import {
  calculateSaleFinancials,
  buildSaleItemSnapshot,
  calculatePaymentBalance,
  roundMoney,
} from './sale.utils.js';
import {
  INVENTORY_REFERENCE_TYPE,
  INVENTORY_TRANSACTION_TYPE,
  INVENTORY_LOG_TYPE,
} from "../inventory/inventory.constants.js";
import generatePublicId from "../../utils/generatePublicId.js";
import Customer from '../customers/customer.model.js';
import Product from '../products/product.model.js';
import { InventoryLog } from '../inventory/inventoryLog.model.js';
import { InventoryTransaction } from '../purchases/inventoryTransaction.model.js';
import { ActivityLog } from '../activity-logs/activityLog.model.js';
import { Warehouse } from '../warehouses/warehouse.model.js';
import Counter from "../../shared/schemas/counter.model.js";
import { getNextSequence } from '../../utils/sequence.util.js';
import QueryBuilder from '../../builder/QueryBuilder.js';
import { InventoryService } from "../inventory/inventory.service.js";
import { ActivityLogService } from "../activity-logs/activityLog.service.js";


/**
 * Safely evaluates consecutive invoice serialized identifiers using atomicity.
 */
const generateSaleInvoiceNumber = async (session) => {
  const currentYear = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `sale-invoice-${currentYear}` },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session }
  );
  return `INV-${currentYear}-${String(counter.sequence).padStart(6, "0")}`;
};

/**
 * Validates request user token context and returns external public identifier footprint.
 */
const getActorPublicId = (reqUser) => {
  if (!reqUser?.publicId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Authenticated user identity is required."
    );
  }
  return reqUser.publicId;
};

/**
 * Confirms customer context exists, is active, and is accessible within the transaction.
 */
const getActiveCustomer = async (customerId, session) => {
  const customer = await Customer.findOne({
    _id: customerId,
    isDeleted: false,
    status: "active",
  }).session(session);

  if (!customer) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Active customer not found or is suspended."
    );
  }
  return customer;
}; 

/**
 * Confirms warehouse master node is active and is accessible within the transaction.
 */
const getActiveWarehouse = async (warehouseId, session) => {
  const warehouse = await Warehouse.findOne({
    _id: warehouseId,
    isDeleted: false,
    status: "active",
  }).session(session);

  if (!warehouse) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Active warehouse not found or is suspended ."
    );
  }
  return warehouse;
}; 

/**
 * Hydrates and validates product data in a single optimized lookup query.
 */
const prepareSaleItems = async (productsInput, session) => {
  const productIds = productsInput.map((item) => item.productId);
  
  const dbProducts = await Product.find({
    _id: { $in: productIds },
    isDeleted: false,
  }).session(session);

  if (dbProducts.length !== productIds.length) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "One or more selected products were not found.");
  }

  const productMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));

  return productsInput.map((item) => {
    const product = productMap.get(item.productId.toString());
    
    if (product.status === "ARCHIVED" || product.status === "DISCONTINUED") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Product "${product.productName}" cannot be sold.`);
    }
    if (product.inventoryConfig?.trackInventory === false) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Inventory tracking is disabled for "${product.productName}".`);
    }

    // Backend-authoritative price extraction protects against client manipulation
    const sellingPrice = Number(product.pricing?.sellingPrice);
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Invalid selling price configured for "${product.productName}".`);
    }

    return buildSaleItemSnapshot({
      product,
      quantity: item.quantity,
      unitPrice: sellingPrice,
      discount: item.discount || 0,
    });
  });
};

/**
 * Validates available stock levels via the central Inventory layer prior to committing.
 */
const validateSaleStock = async ({ warehouseId, saleItems, session }) => {
  for (const item of saleItems) {
    const stock = await InventoryService.getWarehouseStock({
      productId: item.productId,
      warehouseId,
      session,
    });

    if (!stock) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `No warehouse stock balance records found for product ${item.productId}.`
      );
    }
    if (stock.availableStock < item.quantity) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Insufficient stock for product ${item.productName}. Available: ${stock.availableStock}, requested: ${item.quantity}.`
      );
    }
  }
};

/**
 * Safely generates sequential invoice identifiers using an atomic structure.
 */
const generateInvoiceNumber = async (session) => {
  const currentYear = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `sale-invoice-${currentYear}` },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session }
  );
  return `INV-${currentYear}-${String(counter.sequence).padStart(6, "0")}`;
};


/**
 * Creates a complete customer sale transaction document within strict session bounds.
 */
export const createSale = async (payload, reqUser) => {
  const session = await mongoose.startSession();
  session.startTransaction(); // Master multi-document transaction initialized safely

  try {
    // 1. Customer Business Validation
    const customer = await Customer.findOne({
      _id: payload.customerId,
      isDeleted: false,
    }).session(session);

    if (!customer) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Customer not found.");
    }
    if (customer.status !== "ACTIVE") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Inactive customer cannot be used for a sale.");
    }

    // 2. Warehouse Location Business Validation
    const warehouse = await Warehouse.findOne({
      _id: payload.warehouseId,
      isDeleted: false,
    }).session(session);

    if (!warehouse) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Warehouse not found.");
    }
    if (warehouse.status !== "ACTIVE") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Inactive warehouse cannot be used for a sale.");
    }

    // 3. Detect Duplicate Product Input Lines
    const productIds = payload.products.map((item) => item.productId);
    const uniqueProductIds = new Set(productIds.map((id) => id.toString()));
    if (uniqueProductIds.size !== productIds.length) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Duplicate product items identified.");
    }

    // 4. Load & Validate Products Server-Authoritatively
    const saleItems = await prepareSaleItems(payload.products, session);

    // 5. Pre-Save Stock Level Check via Centralized Ledger
    for (const item of saleItems) {
      const stock = await InventoryService.getWarehouseStock({
        productId: item.productId,
        warehouseId: warehouse._id,
        session,
      });

      if (!stock) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Warehouse stock record not found for product ${item.productId}.`);
      }
      if (stock.availableStock < item.quantity) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          `Insufficient stock for product ${item.productName}. Available: ${stock.availableStock}, requested: ${item.quantity}.`
        );
      }
    }

    // 6. Complete Mathematical Financial Calculations
    const financials = calculateSaleFinancials({
      items: saleItems,
      saleDiscount: payload.discount || 0,
      paidAmount: payload.paidAmount || 0,
    });

    if (financials.paidAmount > financials.totalAmount) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Paid amount cannot exceed total sale amount.");
    }
    if (roundMoney(financials.paidAmount + financials.dueAmount) !== financials.totalAmount) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Sale financial calculation is inconsistent.");
    }

    const invoiceNumber = await generateSaleInvoiceNumber(session);
    const publicId = generatePublicId("SALE");

    // 7. Instantiate Invoicing Parent Record
    // Uses reqUser._id for audit matching explicitly to Mongoose relational ObjectId specs
    const sale = new Sale({
      publicId,
      invoiceNumber,
      customerId: customer._id,
      warehouseId: warehouse._id, // Enforce One Sale = One Warehouse Rule
      products: saleItems,
      subtotal: financials.subtotal,
      discount: financials.discount,
      totalAmount: financials.totalAmount,
      paidAmount: financials.paidAmount,
      dueAmount: financials.dueAmount,
      saleDate: payload.saleDate || new Date(),
      status: SALE_STATUS.CONFIRMED,
      remarks: payload.remarks || "",
      createdBy: reqUser._id,
      updatedBy: reqUser._id,
    });

    await sale.save({ session }); // Saved first to provide an immutable tracing referenceId anchor

    // 8. Deduct Stock via Centralized Concurrency-Safe Inventory Service
    for (const item of saleItems) {
      await InventoryService.decreaseStock({
        productId: item.productId,
        warehouseId: warehouse._id,
        quantity: item.quantity,
        referenceType: "SALE",
        referenceId: sale._id, // Polymorphic tracing link injected successfully
        postedBy: reqUser._id,
        remarks: `Stock deducted for sale ${invoiceNumber}.`,
        session, // Shares parent caller session for secure rollbacks
      });
    }

    // 9. Process Initial Downpayment Records Inside Creation Boundary
    if (financials.paidAmount > 0) {
      const payment = new SalePayment({
        publicId: generatePublicId("SPAY"),
        saleId: sale._id,
        customerId: customer._id,
        amount: financials.paidAmount,
        paymentMethod: payload.paymentMethod || "CASH",
        reference: payload.reference || "",
        comment: payload.paymentComment || "Downpayment processed during order registry.",
        createdBy: reqUser._id,
      });
      await payment.save({ session });
    }

    // 10. Update Customer Credit Liabilities Parameters
    customer.currentBalance = roundMoney(Number(customer.currentBalance || 0) + financials.dueAmount);
    customer.totalOrders = Number(customer.totalOrders || 0) + 1;
    customer.totalPurchases = roundMoney(Number(customer.totalPurchases || 0) + financials.totalAmount);
    
    if (financials.paidAmount > 0) {
      customer.totalPaid = roundMoney(Number(customer.totalPaid || 0) + financials.paidAmount);
      customer.lastPaymentDate = new Date();
    }
    await customer.save({ session });

    // 11. Dispatch Activity Log Accountability Trace
    await ActivityLogService.logActivity({
      user: reqUser._id,
      action: "CREATE",
      module: "SALES",
      entityId: sale._id,
      description: `Sale ${invoiceNumber} created successfully.`,
      metadata: {
        invoiceNumber,
        customerId: customer._id,
        warehouseId: warehouse._id,
        totalAmount: financials.totalAmount,
        paidAmount: financials.paidAmount,
        dueAmount: financials.dueAmount,
      },
      session,
    });

    await session.commitTransaction(); // Everything commits atomically
    return sale;
  } catch (error) {
    await session.abortTransaction(); // Error triggers full rollback loop
    throw error;
  } finally {
    session.endSession();
  }
};



/**
 * Processes subsequent collection ledger payments via thread-safe atomic decrements.
 */
export const recordSalePayment = async (salePublicId, payload, reqUser) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findOne({
      publicId: salePublicId,
      isDeleted: false,
    }).session(session);

    if (!sale) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Sale not found.");
    }
    if (sale.status === "cancelled") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Payment cannot be recorded against a cancelled sale.");
    }
    if (sale.dueAmount <= 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This sale has no outstanding due amount.");
    }
    
    const paymentAmount = roundMoney(payload.amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Payment allocation must be greater than zero.");
    }
    if (paymentAmount > Number(sale.dueAmount)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Payment amount cannot exceed the outstanding due amount.");
    }
    const previousDue = roundMoney(sale.dueAmount);
    const paymentBalance = calculatePaymentBalance({
      currentDue: previousDue,
      paymentAmount,
    });
    // Concurrency Shield: Atomic parent document decrement check
    const updatedSale = await Sale.findOneAndUpdate(
      {
        _id: sale._id,
        isDeleted: false,
        dueAmount: { $gte: paymentAmount },
      },
      {
        $inc: {
          paidAmount: paymentAmount,
          dueAmount: -paymentAmount,
        },
        $set: {
          status: paymentBalance.remainingDue === 0 ? "paid" : "partial_paid",
          updatedBy: reqUser._id,
        },
      },
      { new: true, session }
    );
    
    if (!updatedSale) {
      throw new ApiError(HTTP_STATUS.CONFLICT, "Transaction conflict: The invoice balance has shifted. Please reload.");
    }
    // Concurrency Shield: Atomic Customer outstanding balance decrement
    const updatedCustomer = await Customer.findOneAndUpdate(
      {
        _id: sale.customerId,
        isDeleted: false,
        currentBalance: { $gte: paymentAmount },
      },
      {
        $inc: {currentBalance: -paymentAmount,
          totalPaid: paymentAmount,
        },
        $set: {
          lastPaymentDate: new Date(),
        },
      },
      { new: true, session }
    );
    
    if (!updatedCustomer) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Transaction conflict: Customer balance state validation failed.");
    }
    
    const payment = new SalePayment({
      publicId: generatePublicId("SPAY"),
      saleId: sale._id,
      customerId: sale.customerId,
      amount: paymentAmount,
      paymentMethod: payload.paymentMethod,
      reference: payload.reference || "",
      comment: payload.comment || "",
      createdBy: reqUser._id,
    });
    
    await payment.save({ session });
    
    await ActivityLogService.logActivity({
      user: reqUser._id,
      action: "PAYMENT_RECORDED",
      module: "SALES",
      entityId: sale._id,
      description: `Payment recorded for sale ${sale.invoiceNumber}.`,
      metadata: {
        salePublicId: sale.publicId,
        invoiceNumber: sale.invoiceNumber,
        paymentPublicId: payment.publicId,
        amount: paymentAmount,
        previousDue,
        remainingDue: updatedSale.dueAmount,
        paymentMethod: payload.paymentMethod,
      },session,
    });
    await session.commitTransaction();
    
    return {
      sale: updatedSale,
      payment,
      customerBalance: updatedCustomer.currentBalance,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};


/**
  High-Throughput Read Pipeline using QueryBuilder.
*/
export const getSales = async (queryParameters) => {
  const queryInstance = new QueryBuilder(
    Sale.find({ isDeleted: false })
    .populate("customerId", "publicId name phone email")
    .populate("warehouseId", "publicId warehouseName warehouseCode"),
    queryParameters
  )
  .search(["invoiceNumber"])
  .filter()
  .sort()
  .paginate();
  
  const data = await queryInstance.modelQuery;
  const meta = await queryInstance.countTotal();
  
  return {
    data,
    meta,
  };
};

/**
 Fetch a single distinct audit event entry using publicId parameter validation.
*/

 export const getSaleByPublicId = async (publicId) => {
  const sale = await Sale.findOne({
    publicId,
    isDeleted: false,
  })
  .populate("customerId", "publicId name phone email")
  .populate("warehouseId", "publicId warehouseName warehouseCode")
  .populate("products.productId", "publicId productName sku");
  
  if (!sale) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Sale not found.");
  }
  
  return sale;
};


export const SaleService = {
  createSale,
  recordSalePayment,
  getSales,
  getSaleByPublicId,
};