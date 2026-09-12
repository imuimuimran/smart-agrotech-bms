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
 * Generates human-readable sequential invoice numbers using an atomic counter index.
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
 * Loads products from master data within session, resolving prices and historical costs server-side.
 */
const prepareSaleItems = async (productsInput, session) => {
  const productIds = productsInput.map((item) => item.productId);
  
  const dbProducts = await Product.find({
    _id: { $in: productIds },
    isDeleted: false,
    status: "active",
  }).session(session);

  if (dbProducts.length !== productIds.length) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "One or more products were not found or are inactive."
    );
  }

  const productMap = new Map(
    dbProducts.map((product) => [product._id.toString(), product])
  );

  return productsInput.map((item) => {
    const product = productMap.get(item.productId.toString());
    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        `Product reference mapping missing for ID ${item.productId}.`
      );
    }
    if (product.productType !== "physical") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Product "${product.productName}" is not a physical inventory item.`
      );
    }
    if (!product.inventoryConfig?.trackInventory) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Inventory tracking is disabled for "${product.productName}".`
      );
    }

    const authoritativeSellingPrice = Number(product.pricing?.sellingPrice);
    const authoritativeCostBasis = Number(product.pricing?.purchasePrice);

    if (!Number.isFinite(authoritativeSellingPrice) || !Number.isFinite(authoritativeCostBasis)) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        `Pricing or valuation structures are corrupted for "${product.productName}".`
      );
    }

    // Build historical immutable snapshot row mapping price vs inventory cost snapshot
    const itemSnapshot = buildSaleItemSnapshot({
      product,
      quantity: item.quantity,
      unitPrice: authoritativeSellingPrice,
      discount: item.discount || 0,
    });

    // Explicit inject cost basis parameters to prevent misusing selling price as cost metrics
    return {
      productId: itemSnapshot.productId,
      productName: itemSnapshot.productName,
      sku: itemSnapshot.sku,
      quantity: itemSnapshot.quantity,
      unitPrice: itemSnapshot.unitPrice,
      unitCost: authoritativeCostBasis, // Locked inventory cost snapshot applied securely
      discount: itemSnapshot.discount,
      lineTotal: itemSnapshot.lineTotal,
    };
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
  const actorPublicId = getActorPublicId(reqUser);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customer = await getActiveCustomer(payload.customerId, session);
    const warehouse = await getActiveWarehouse(payload.warehouseId, session);
    
    // Prevent duplicate line entry vectors
    const productIds = payload.products.map((item) => item.productId);
    const uniqueProductIds = new Set(productIds.map((id) => id.toString()));
    if (uniqueProductIds.size !== productIds.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Duplicate product line rows detected.");
    }

    const saleItems = await prepareSaleItems(payload.products, session);

    await validateSaleStock({
      warehouseId: warehouse._id,
      saleItems,
      session,
    });

    const financials = calculateSaleFinancials({
      items: saleItems,
      saleDiscount: payload.discount || 0,
      paidAmount: payload.paidAmount || 0,
    });

    if (financials.paidAmount > financials.totalAmount) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Initial collected payment cannot exceed invoice total values.");
    }

    const invoiceNumber = await generateInvoiceNumber(session);
    const publicId = generatePublicId("SALE");

    // Instantiation exactly matching your original Phase 11.2 schema contracts
    const sale = new Sale({
      publicId,
      invoiceNumber,
      customerId: customer._id,
      warehouseId: warehouse._id, 
      products: saleItems,
      subtotal: financials.subtotal,
      discount: financials.discount,
      totalAmount: financials.totalAmount,
      paidAmount: financials.paidAmount,
      dueAmount: financials.dueAmount,
      saleDate: payload.saleDate || new Date(),
      status: SALE_STATUS.CONFIRMED,
      remarks: payload.remarks || "",
      createdBy: reqUser.id,
      updatedBy: reqUser.id,
    });

    await sale.save({ session }); 

    // Deduct stock via centralized concurrency-safe Inventory Service
    for (const item of saleItems) {
      await InventoryService.decreaseStock({
        productId: item.productId,
        warehouseId: warehouse._id,
        quantity: item.quantity,
        referenceType: "SALE",
        referenceId: sale._id,
        postedBy: reqUser.id,
        remarks: `Stock issued out for transaction invoice ${sale.invoiceNumber}`,
        session,
      });
    }

    // Phase 11.5.7.4: Handle initial inline downpayment within the creation boundary transaction
    if (financials.paidAmount > 0) {
      const payment = new SalePayment({
        publicId: generatePublicId("SPAY"),
        saleId: sale._id,
        customerId: customer._id,
        amount: financials.paidAmount,
        paymentMethod: payload.paymentMethod || "CASH",
        reference: payload.reference || "",
        comment: payload.paymentComment || "Downpayment processed during order registry.",
        createdBy: reqUser.id,
      });
      await payment.save({ session });
    }

    // Update customer credit liabilities parameters atomically
    customer.currentBalance = roundMoney(Number(customer.currentBalance || 0) + financials.dueAmount);
    customer.totalOrders = Number(customer.totalOrders || 0) + 1;
    customer.totalPurchases = roundMoney(Number(customer.totalPurchases || 0) + financials.totalAmount);
    
    if (financials.paidAmount > 0) {
      customer.totalPaid = roundMoney(Number(customer.totalPaid || 0) + financials.paidAmount);
      customer.lastPaymentDate = new Date();
    }
    await customer.save({ session });

    // Append accountability log footprint
    await ActivityLogService.logActivity({
      user: reqUser.id,
      action: "CREATE",
      module: "SALES",
      entityId: sale._id,
      description: `Sale invoice ${invoiceNumber} created successfully.`,
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

    await session.commitTransaction(); 
    return sale;
  } catch (error) {
    await session.abortTransaction(); 
    throw error;
  } finally {
    await session.endSession();
  }
};



/**
 * Registers an independent collection or payment balance settlement record against an invoice.
 */
export const recordSalePayment = async (salePublicId, payload, reqUser) => {
  const actorPublicId = getActorPublicId(reqUser);
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // 1. Stale-Read Validation Check
    const sale = await Sale.findOne({
      publicId: salePublicId,
      isDeleted: false,
    }).session(session);
    
    if (!sale) {
      throw new ApiError(httpStatus.NOT_FOUND, "Sale transaction target records not found.");
    }
    if (sale.status === "cancelled") {
      throw new ApiError(httpStatus.BAD_REQUEST, "Payment registration blocked against a cancelled sale.");
    }
    if (sale.dueAmount <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "This transaction invoice has already been fully paid.");
    }
    
    const paymentAmount = roundMoney(payload.amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Payment allocation must be greater than zero.");
    }
    if (paymentAmount > Number(sale.dueAmount)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Payment amount cannot exceed the remaining outstanding invoice due balance.");
    }
    
    const previousDue = roundMoney(sale.dueAmount);
    const paymentBalance = calculatePaymentBalance({
      currentDue: previousDue,
      paymentAmount,
    });
    
    // 2. Concurrency Shield: Atomic parent document decrement check
    const updatedSale = await Sale.findOneAndUpdate(
      {
        _id: sale._id,
        isDeleted: false,
        dueAmount: { $gte: paymentAmount }, // Concurrency protection condition
        },
        {
          $inc: {
            paidAmount: paymentAmount,
            dueAmount: -paymentAmount,
          },
            $set: {
              // Advance state string flags based on remaining balances configuration
              status: paymentBalance.remainingDue === 0 ? "paid" : "partial_paid",
              updatedBy: reqUser.id,
            },
          },
          { new: true, session }
        );
        
        if (!updatedSale) {
          throw new ApiError(httpStatus.CONFLICT, "Transaction conflict: The invoice balance has shifted. Please reload.");
        }
        
        // 3. Concurrency Shield: Atomic Customer outstanding balance decrement
        const updatedCustomer = await Customer.findOneAndUpdate(
          {
            _id: sale.customerId,
            isDeleted: false,
            currentBalance: { $gte: paymentAmount }, // Prevent invalid negative balance updates
          },
          {
            $inc: {currentBalance: -paymentAmount,
            totalPaid: paymentAmount,
          },
          $set: {lastPaymentDate: new Date(),
          },
        },
        { new: true, session }
      );
      
      if (!updatedCustomer) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Transaction conflict: Customer balance state validation failed.");
      }
      
      // 4. Immutable Payment Tracking Subcollection Persistence
      const payment = new SalePayment({
        publicId: generatePublicId("SPAY"),
        saleId: sale._id,
        customerId: sale.customerId,
        amount: paymentAmount,
        paymentMethod: payload.paymentMethod,
        reference: payload.reference || "",
        comment: payload.comment || "",
        createdBy: reqUser.id,
      });
      
      await payment.save({ session });
      
      // 5. System Accountability Audit Logging Dispatch
      await ActivityLogService.logActivity({
        user: reqUser.id,action: "PAYMENT_RECORDED",
        module: "SALES",entityId: sale._id,
        description: `Collection of ৳${paymentAmount} captured for invoice ${sale.invoiceNumber}.`,
        metadata: {
          salePublicId: sale.publicId,
          invoiceNumber: sale.invoiceNumber,
          paymentPublicId: payment.publicId,
          amount: paymentAmount,
          previousDue,
          remainingDue: updatedSale.dueAmount,
          paymentMethod: payload.paymentMethod,
        },
        session,
      });
      
      await session.commitTransaction(); // Everything commits or safely rolls back together
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