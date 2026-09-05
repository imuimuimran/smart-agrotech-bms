import mongoose from 'mongoose';
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
import { ActivityLog } from '../activityLogs/activityLog.model.js';
import { getNextSequence } from '../../utils/sequence.util.js';
import generatePublicId from '../../utils/publicId.util.js';
import QueryBuilder from '../../builder/QueryBuilder.js';

// /**
//  * Create a new enterprise sale transaction.
//  */
export const createSaleService = async (payload, currentUser) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerId, products, discount = 0, paidAmount = 0, saleDate, remarks } = payload;

    // 1. Validate Active Customer
    const customer = await Customer.findOne({ _id: customerId, isDeleted: { $ne: true } }).session(session);
    if (!customer) {
      throw new Error('Customer not found or is inactive.');
    }
    if (customer.status === 'INACTIVE') {
      throw new Error('Cannot process transactions for an inactive customer.');
    }

    // 2. Validate Products, Stock availability, and Build Historical Snapshots
    const validatedItems = [];
    for (const item of products) {
      const product = await Product.findOne({ _id: item.productId, isDeleted: { $ne: true } }).session(session);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }

      if (product.status !== 'ACTIVE') {
        throw new Error(`Product "${product.productName}" is not active for sale.`);
      }

      // Check currentStock capacity
      if (product.currentStock < item.quantity) {
        throw new Error(`Insufficient stock for product "${product.productName}". Available: ${product.currentStock}, Requested: ${item.quantity}`);
      }

      // Enforce authoritative pricing: use product's default nested pricing property
      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : product.pricing.sellingPrice;

      // Build immutable subdocument snapshot
      const snapshot = buildSaleItemSnapshot({
        product,
        quantity: item.quantity,
        unitPrice,
        discount: item.discount,
      });

      validatedItems.push({
        snapshot,
        productDoc: product,
      });
    }

    const itemSnapshots = validatedItems.map((i) => i.snapshot);

    // 3. Authoritative Financial Calculations
    const financials = calculateSaleFinancials({
      items: itemSnapshots,
      saleDiscount: discount,
      paidAmount,
    });

    if (financials.paidAmount > financials.totalAmount) {
      throw new Error('Initial payment amount cannot exceed the total sale amount.');
    }

    // 4. Generate Atomic Sequential Invoice Number
    const seqValue = await getNextSequence('invoice', session);
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(seqValue).padStart(6, '0')}`;
    const salePublicId = generatePublicId('SALE');

    // 5. Persist the Sale Document
    const saleDoc = new Sale({
      publicId: salePublicId,
      invoiceNumber,
      customerId: customer._id,
      products: itemSnapshots,
      subtotal: financials.subtotal,
      discount: financials.discount,
      totalAmount: financials.totalAmount,
      paidAmount: financials.paidAmount,
      dueAmount: financials.dueAmount,
      saleDate: saleDate || new Date(),
      status: SALE_STATUS.CONFIRMED,
      remarks,
      createdBy: currentUser._id,
    });

    await saleDoc.save({ session });

    // 6. Update Product Stock and Create Stock Movement Audit Trails (InventoryTransactions)
    for (const item of validatedItems) {
      const { productDoc, snapshot } = item;

      // Deduct currentStock
      productDoc.currentStock -= snapshot.quantity;
      productDoc.updatedBy = currentUser._id;
      await productDoc.save({ session });

      // Create tracking record using the verified purchases/inventoryTransaction module path
      const inventoryTxn = new InventoryTransaction({
        publicId: generatePublicId('INVTX'),
        productId: productDoc._id,
        type: 'SALE_OUT',
        quantity: snapshot.quantity,
        referenceModel: 'Sale',
        referenceId: saleDoc._id,
        remarks: `Sale fulfillment for Invoice ${invoiceNumber}`,
        createdBy: currentUser._id,
      });
      await inventoryTxn.save({ session });
    }

    // 7. Persist Initial Payment Record if paidAmount > 0
    if (financials.paidAmount > 0) {
      const paymentDoc = new SalePayment({
        publicId: generatePublicId('PAY'),
        saleId: saleDoc._id,
        customerId: customer._id,
        amount: financials.paidAmount,
        paymentMethod: 'CASH',
        reference: `Initial payment for ${invoiceNumber}`,
        createdBy: currentUser._id,
      });
      await paymentDoc.save({ session });
    }

    // 8. Integrate with Ledger / Update Customer Balance Fields
    customer.currentBalance = (customer.currentBalance || 0) + financials.dueAmount;
    customer.totalDue = (customer.totalDue || 0) + financials.dueAmount; 
    customer.totalPurchase = (customer.totalPurchase || 0) + financials.totalAmount;
    customer.totalPaid = (customer.totalPaid || 0) + financials.paidAmount;
    await customer.save({ session });

    // 9. Enterprise Activity Logging Integration
    const activityLog = new ActivityLog({
      userId: currentUser._id,
      module: 'SALES',
      action: 'SALE_CREATED',
      description: `Sale ${invoiceNumber} created for customer ${customer.name || customer.customerName}.`,
      metadata: { saleId: saleDoc._id, invoiceNumber, totalAmount: financials.totalAmount },
    });
    await activityLog.save({ session });

    await session.commitTransaction();
    session.endSession();

    return saleDoc;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};


/**
 * Record an installment or subsequent payment against a sale.
 */
export const recordSalePaymentService = async (salePublicId, payload, currentUser) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, paymentMethod, reference, comment } = payload;

    const sale = await Sale.findOne({ publicId: salePublicId, isDeleted: { $ne: true } }).session(session);
    if (!sale) {
      throw new Error('Sale record not found.');
    }

    if (sale.status === SALE_STATUS.CANCELLED) {
      throw new Error('Cannot record payment for a cancelled sale.');
    }

    if (sale.dueAmount <= 0) {
      throw new Error('This sale is already fully paid.');
    }

    if (amount > sale.dueAmount) {
      throw new Error(`Payment amount (${amount}) exceeds current outstanding due (${sale.dueAmount}).`);
    }

    const balanceInfo = calculatePaymentBalance({
      currentDue: sale.dueAmount,
      paymentAmount: amount,
    });

    const paymentDoc = new SalePayment({
      publicId: generatePublicId('PAY'),
      saleId: sale._id,
      customerId: sale.customerId,
      amount,
      paymentMethod,
      reference,
      comment,
      createdBy: currentUser._id,
    });
    await paymentDoc.save({ session });

    sale.paidAmount += amount;
    sale.dueAmount = balanceInfo.remainingDue;
    if (sale.dueAmount === 0 && sale.status === SALE_STATUS.CONFIRMED) {
      sale.status = SALE_STATUS.COMPLETED;
    }
    sale.updatedBy = currentUser._id;
    await sale.save({ session });

    // Update customer balances
    const customer = await Customer.findById(sale.customerId).session(session);
    if (customer) {
      customer.totalDue = Math.max(0, (customer.totalDue || 0) - amount);
      customer.totalPaid = (customer.totalPaid || 0) + amount;
      customer.lastPaymentDate = new Date();
      await customer.save({ session });
    }

    // Activity Log
    const activityLog = new ActivityLog({
      publicId: generatePublicId('ACT'),
      userId: currentUser._id,
      module: 'SALES',
      action: 'SALE_PAYMENT_RECORDED',
      description: `Recorded payment of ${amount} for Invoice ${sale.invoiceNumber}`,
      metadata: { saleId: sale._id, invoiceNumber: sale.invoiceNumber, amount },
    });
    await activityLog.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { sale, payment: paymentDoc };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Retrieve sales with QueryBuilder pagination, sorting, and filtering.
 */
export const getAllSalesService = async (queryParams) => {
  const queryBuilder = new QueryBuilder(Sale.find({ isDeleted: { $ne: true } }).populate('customerId', 'name phone publicId'), queryParams)
    .search(['invoiceNumber'])
    .filter()
    .sort()
    .paginate();

  const sales = await queryBuilder.query;
  const total = await Sale.countDocuments(queryBuilder.getFilterConditions());

  return { sales, total };
};

/**
 * Retrieve a single sale by publicId.
 */
export const getSaleByPublicIdService = async (publicId) => {
  const sale = await Sale.findOne({ publicId, isDeleted: { $ne: true } })
    .populate('customerId', 'name phone email address publicId')
    .populate('createdBy', 'name email');

  if (!sale) {
    throw new Error('Sale record not found.');
  }

  const payments = await SalePayment.find({ saleId: sale._id, isDeleted: { $ne: true } }).sort('-createdAt');

  return { sale, payments };
};
