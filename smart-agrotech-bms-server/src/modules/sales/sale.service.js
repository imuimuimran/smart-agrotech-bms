import mongoose from 'mongoose';
import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js"; 
import { Sale } from './sale.model.js';
import { SalePayment } from './salePayment.model.js';
import { SALE_STATUS } from './sale.constants.js';
import {
  calculateSaleFinancials,
  buildSaleItemSnapshot,
  calculatePaymentBalance,
} from './sale.utils.js';
import Customer from '../customers/customer.model.js';
import Product from '../products/product.model.js';
import { InventoryLog } from '../inventory/inventoryLog.model.js';
import { InventoryTransaction } from '../purchases/inventoryTransaction.model.js';
import { ActivityLog } from '../activity-logs/activityLog.model.js';
import { Warehouse } from '../warehouses/warehouse.model.js';
import { getNextSequence } from '../../utils/sequence.util.js';
import generatePublicId from '../../utils/generatePublicId.js';
import QueryBuilder from '../../builder/QueryBuilder.js';
import { InventoryService } from "../inventory/inventory.service.js";
import { ActivityLogService } from "../activity-logs/activityLog.service.js";


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
 * Safely evaluates consecutive invoice serialized identifiers using atomicity.
 */
const generateInvoiceNumber = async () => {
  const sequence = await getNextSequence("sale");
  return `INV-${String(sequence).padStart(6, "0")}`;
};


/**
 * Create a new customer sale transaction document within strict session bounds.
 */
export const createSale = async (payload, reqUser) => {
  const actorPublicId = getActorPublicId(reqUser);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Structural Rule Check: Initial creation operations cannot override payments directly
    if (Number(payload.paidAmount || 0) > 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Initial payment must be recorded explicitly through the subsequent recordSalePayment workflow."
      );
    }

    const customer = await getActiveCustomer(payload.customerId, session);
    const warehouse = await getActiveWarehouse(payload.warehouseId, session);
    const saleItems = await prepareSaleItems(payload.products, session);

    // Verify stock availability layers across location mappings
    await validateSaleStock({
      warehouseId: warehouse._id,
      saleItems,
      session,
    });

    const financials = calculateSaleFinancials({
      items: saleItems,
      saleDiscount: payload.discount || 0,
      paidAmount: 0, // Enforced baseline value setup
    });

    const invoiceNumber = await generateInvoiceNumber();
    const publicId = generatePublicId("SALE");

    // Instantiation matching your original Phase 11.2 schema mappings
    const sale = new Sale({
      publicId,
      invoiceNumber,
      customerId: customer._id,
      warehouseId: warehouse._id,
      products: saleItems,
      subtotal: financials.subtotal,
      discount: financials.discount,
      totalAmount: financials.totalAmount,
      paidAmount: 0,
      dueAmount: financials.dueAmount,
      saleDate: payload.saleDate || new Date(),
      status: SALE_STATUS.CONFIRMED,
      remarks: payload.remarks || "",
      createdBy: reqUser._id,
      updatedBy: reqUser._id,
    });

    await sale.save({ session });

    // Deduct warehouse balances atomically using centralized Inventory Service
    for (const item of saleItems) {
      await InventoryService.decreaseStock({
        productId: item.productId,
        warehouseId: warehouse._id,
        quantity: item.quantity,
        transactionType: "SALE",
        referenceType: "SALE",
        referenceId: sale._id,
        unitCost: item.unitCost, // Pass accurate cost-basis for COGS accounting logs
        postedBy: reqUser._id,
        remarks: `Stock issued out for transaction invoice ${sale.invoiceNumber}`,
        session,
      });
    }

    // Synchronize customer credit liabilities balance metrics
    await Customer.findByIdAndUpdate(
      customer._id,
      {
        $inc: {
          currentBalance: financials.dueAmount,
          totalOrders: 1,
          totalPurchases: financials.totalAmount,
        },
      },
      { session, new: true }
    );

    // Log tracking accountability trail
    await ActivityLogService.logActivity({
      user: reqUser._id,
      action: "CREATE",
      module: "SALES",
      entityId: sale._id,
      description: `Sale invoice ${sale.invoiceNumber} successfully created and stock issued.`,
      metadata: {
        salePublicId: sale.publicId,
        customerId: customer.publicId,
        warehouseId: warehouse.publicId,
        totalAmount: financials.totalAmount,
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
    const sale = await Sale.findOne({
      publicId: salePublicId,
      isDeleted: false,
    }).session(session);

    if (!sale) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Sale transaction target records not found.");
    }
    if (sale.status === SALE_STATUS.CANCELLED) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Payment registration blocked against a cancelled sale.");
    }
    if (sale.dueAmount <= 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This transaction invoice has already been fully paid.");
    }

    const paymentAmount = Number(payload.amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Payment distribution amount must be greater than zero.");
    }
    if (paymentAmount > Number(sale.dueAmount)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Payment amount cannot exceed the remaining outstanding invoice due balance.");
    }
    const paymentBalance = calculatePaymentBalance({currentDue: sale.dueAmount,paymentAmount,});

    const payment = new SalePayment(
      {
        publicId: generatePublicId("SPAY"),
        saleId: sale._id,
        customerId: sale.customerId,
        amount: paymentAmount,
        paymentMethod: payload.paymentMethod,
        reference: payload.reference || "",
        comment: payload.comment || "",
        createdBy: reqUser._id,
      }
    );

    await payment.save({ session });

    // Mutate state vectors on parent invoice document
    sale.paidAmount = Number(sale.paidAmount) + paymentAmount;
    sale.dueAmount = paymentBalance.remainingDue;

    // Auto advance parent state to paid if liabilities hit exact alignment zero thresholds
    if (sale.dueAmount === 0) {
      sale.status = SALE_STATUS.PAID;
    } else {
      sale.status = SALE_STATUS.PARTIAL_PAID;
    }

    await sale.save({ session });

    // Step down customer outstanding general liability balances
    await Customer.findByIdAndUpdate(
      sale.customerId,
      {
        $inc: {
          currentBalance: -paymentAmount,
        },
      },
      { session }
    );

    await ActivityLogService.logActivity({
      user: reqUser._id,
      action: "PAYMENT_RECORDED",
      module: "SALES",
      entityId: sale._id,
      description: `Payment allocation of ${paymentAmount} registered for invoice 
      ${sale.invoiceNumber}.`,
      metadata: {
        paymentPublicId: payment.publicId,
        amount: paymentAmount,
        remainingDue: paymentBalance.remainingDue,
        paymentMethod: payload.paymentMethod,
      },
      session,
    });

    await session.commitTransaction();
    return { payment, sale };
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
    throw new ApiError(httpStatus.NOT_FOUND, "Sale not found.");
  }
  
  return sale;
};


export const SaleService = {
  createSale,
  recordSalePayment,
  getSales,
  getSaleByPublicId,
};



// // /**
// //  * Create a new enterprise sale transaction.
// //  */
// export const createSaleService = async (payload, currentUser) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { customerId, products, discount = 0, paidAmount = 0, saleDate, remarks } = payload;

//     // 1. Validate Active Customer
//     const customer = await Customer.findOne({ _id: customerId, isDeleted: { $ne: true } }).session(session);
//     if (!customer) {
//       throw new Error('Customer not found or is inactive.');
//     }
//     if (customer.status === 'INACTIVE') {
//       throw new Error('Cannot process transactions for an inactive customer.');
//     }

//     // 2. Validate Products, Stock availability, and Build Historical Snapshots
//     const validatedItems = [];
//     for (const item of products) {
//       const product = await Product.findOne({ _id: item.productId, isDeleted: { $ne: true } }).session(session);
//       if (!product) {
//         throw new Error(`Product with ID ${item.productId} not found.`);
//       }

//       if (product.status !== 'ACTIVE') {
//         throw new Error(`Product "${product.productName}" is not active for sale.`);
//       }

//       // Check currentStock capacity
//       if (product.currentStock < item.quantity) {
//         throw new Error(`Insufficient stock for product "${product.productName}". Available: ${product.currentStock}, Requested: ${item.quantity}`);
//       }

//       // Enforce authoritative pricing: use product's default nested pricing property
//       const unitPrice = item.unitPrice !== undefined ? item.unitPrice : product.pricing.sellingPrice;

//       // Build immutable subdocument snapshot
//       const snapshot = buildSaleItemSnapshot({
//         product,
//         quantity: item.quantity,
//         unitPrice,
//         discount: item.discount,
//       });

//       validatedItems.push({
//         snapshot,
//         productDoc: product,
//       });
//     }

//     const itemSnapshots = validatedItems.map((i) => i.snapshot);

//     // 3. Authoritative Financial Calculations
//     const financials = calculateSaleFinancials({
//       items: itemSnapshots,
//       saleDiscount: discount,
//       paidAmount,
//     });

//     if (financials.paidAmount > financials.totalAmount) {
//       throw new Error('Initial payment amount cannot exceed the total sale amount.');
//     }

//     // 4. Generate Atomic Sequential Invoice Number
//     const seqValue = await getNextSequence('invoice', session);
//     const year = new Date().getFullYear();
//     const invoiceNumber = `INV-${year}-${String(seqValue).padStart(6, '0')}`;
//     const salePublicId = generatePublicId('SALE');

//     // 5. Persist the Sale Document
//     const saleDoc = new Sale({
//       publicId: salePublicId,
//       invoiceNumber,
//       customerId: customer._id,
//       products: itemSnapshots,
//       subtotal: financials.subtotal,
//       discount: financials.discount,
//       totalAmount: financials.totalAmount,
//       paidAmount: financials.paidAmount,
//       dueAmount: financials.dueAmount,
//       saleDate: saleDate || new Date(),
//       status: SALE_STATUS.CONFIRMED,
//       remarks,
//       createdBy: currentUser._id,
//     });

//     await saleDoc.save({ session });

//     // 6. Update Product Stock and Create Stock Movement Audit Trails (InventoryTransactions)
//     for (const item of validatedItems) {
//       const { productDoc, snapshot } = item;

//       // Deduct currentStock
//       productDoc.currentStock -= snapshot.quantity;
//       productDoc.updatedBy = currentUser._id;
//       await productDoc.save({ session });

//       // Create tracking record using the verified purchases/inventoryTransaction module path
//       const inventoryTxn = new InventoryTransaction({
//         publicId: generatePublicId('INVTX'),
//         productId: productDoc._id,
//         type: 'SALE_OUT',
//         quantity: snapshot.quantity,
//         referenceModel: 'Sale',
//         referenceId: saleDoc._id,
//         remarks: `Sale fulfillment for Invoice ${invoiceNumber}`,
//         createdBy: currentUser._id,
//       });
//       await inventoryTxn.save({ session });
//     }

//     // 7. Persist Initial Payment Record if paidAmount > 0
//     if (financials.paidAmount > 0) {
//       const paymentDoc = new SalePayment({
//         publicId: generatePublicId('PAY'),
//         saleId: saleDoc._id,
//         customerId: customer._id,
//         amount: financials.paidAmount,
//         paymentMethod: 'CASH',
//         reference: `Initial payment for ${invoiceNumber}`,
//         createdBy: currentUser._id,
//       });
//       await paymentDoc.save({ session });
//     }

//     // 8. Integrate with Ledger / Update Customer Balance Fields
//     customer.currentBalance = (customer.currentBalance || 0) + financials.dueAmount;
//     customer.totalDue = (customer.totalDue || 0) + financials.dueAmount; 
//     customer.totalPurchase = (customer.totalPurchase || 0) + financials.totalAmount;
//     customer.totalPaid = (customer.totalPaid || 0) + financials.paidAmount;
//     await customer.save({ session });

//     // 9. Enterprise Activity Logging Integration
//     const activityLog = new ActivityLog({
//       userId: currentUser._id,
//       module: 'SALES',
//       action: 'SALE_CREATED',
//       description: `Sale ${invoiceNumber} created for customer ${customer.name || customer.customerName}.`,
//       metadata: { saleId: saleDoc._id, invoiceNumber, totalAmount: financials.totalAmount },
//     });
//     await activityLog.save({ session });

//     await session.commitTransaction();
//     session.endSession();

//     return saleDoc;
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };


// /**
//  * Record an installment or subsequent payment against a sale.
//  */
// export const recordSalePaymentService = async (salePublicId, payload, currentUser) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { amount, paymentMethod, reference, comment } = payload;

//     const sale = await Sale.findOne({ publicId: salePublicId, isDeleted: { $ne: true } }).session(session);
//     if (!sale) {
//       throw new Error('Sale record not found.');
//     }

//     if (sale.status === SALE_STATUS.CANCELLED) {
//       throw new Error('Cannot record payment for a cancelled sale.');
//     }

//     if (sale.dueAmount <= 0) {
//       throw new Error('This sale is already fully paid.');
//     }

//     if (amount > sale.dueAmount) {
//       throw new Error(`Payment amount (${amount}) exceeds current outstanding due (${sale.dueAmount}).`);
//     }

//     const balanceInfo = calculatePaymentBalance({
//       currentDue: sale.dueAmount,
//       paymentAmount: amount,
//     });

//     const paymentDoc = new SalePayment({
//       publicId: generatePublicId('PAY'),
//       saleId: sale._id,
//       customerId: sale.customerId,
//       amount,
//       paymentMethod,
//       reference,
//       comment,
//       createdBy: currentUser._id,
//     });
//     await paymentDoc.save({ session });

//     sale.paidAmount += amount;
//     sale.dueAmount = balanceInfo.remainingDue;
//     if (sale.dueAmount === 0 && sale.status === SALE_STATUS.CONFIRMED) {
//       sale.status = SALE_STATUS.COMPLETED;
//     }
//     sale.updatedBy = currentUser._id;
//     await sale.save({ session });

//     // Update customer balances
//     const customer = await Customer.findById(sale.customerId).session(session);
//     if (customer) {
//       customer.totalDue = Math.max(0, (customer.totalDue || 0) - amount);
//       customer.totalPaid = (customer.totalPaid || 0) + amount;
//       customer.lastPaymentDate = new Date();
//       await customer.save({ session });
//     }

//     // Activity Log
//     const activityLog = new ActivityLog({
//       publicId: generatePublicId('ACT'),
//       userId: currentUser._id,
//       module: 'SALES',
//       action: 'SALE_PAYMENT_RECORDED',
//       description: `Recorded payment of ${amount} for Invoice ${sale.invoiceNumber}`,
//       metadata: { saleId: sale._id, invoiceNumber: sale.invoiceNumber, amount },
//     });
//     await activityLog.save({ session });

//     await session.commitTransaction();
//     session.endSession();

//     return { sale, payment: paymentDoc };
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };

// /**
//  * Retrieve sales with QueryBuilder pagination, sorting, and filtering.
//  */
// export const getAllSalesService = async (queryParams) => {
//   const queryBuilder = new QueryBuilder(Sale.find({ isDeleted: { $ne: true } }).populate('customerId', 'name phone publicId'), queryParams)
//     .search(['invoiceNumber'])
//     .filter()
//     .sort()
//     .paginate();

//   const sales = await queryBuilder.query;
//   const total = await Sale.countDocuments(queryBuilder.getFilterConditions());

//   return { sales, total };
// };

// /**
//  * Retrieve a single sale by publicId.
//  */
// export const getSaleByPublicIdService = async (publicId) => {
//   const sale = await Sale.findOne({ publicId, isDeleted: { $ne: true } })
//     .populate('customerId', 'name phone email address publicId')
//     .populate('createdBy', 'name email');

//   if (!sale) {
//     throw new Error('Sale record not found.');
//   }

//   const payments = await SalePayment.find({ saleId: sale._id, isDeleted: { $ne: true } }).sort('-createdAt');

//   return { sale, payments };
// };