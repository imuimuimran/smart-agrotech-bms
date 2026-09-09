// import mongoose from 'mongoose';
// import { SALE_STATUS, PAYMENT_STATUS } from './sale.constants.js';

// const { Schema, model } = mongoose;

// const saleItemSchema = new Schema(
//   {
//     productId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Product',
//       required: true,
//     },
//     productName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     sku: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     quantity: {
//       type: Number,
//       required: true,
//       min: [1, 'Quantity must be at least 1'],
//       validate: {
//         validator: Number.isInteger,
//         message: 'Quantity must be an integer',
//       },
//     },
//     unitPrice: {
//       type: Number,
//       required: true,
//       min: [0, 'Unit price cannot be negative'],
//     },
//     unitCost: {
//       type: Number,
//       required: true,
//       min: [0, "Unit cost-basis snapshot cannot be negative."],
//     },
//     discountAmount: {
//       type: Number,
//       default: 0,
//       min: [0, 'Item discount cannot be negative'],
//     },
//     taxAmount: {
//       type: Number,
//       default: 0,
//       min: [0, "Line tax cannot be negative."],
//     },
//     subtotal: {
//       type: Number,
//       required: true,
//       min: [0, "Line net total cannot be negative."],
//     },
//   },
//   { _id: false }
// );

// const saleSchema = new Schema(
//   {
//     publicId: {
//       type: String,
//       required: true,
//       unique: true,
//       index: true,
//       trim: true,
//     },
//     invoiceNumber: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//     },
//     customerId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Customer',
//       required: true,
//       index: true,
//     },
//     warehouseId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Warehouse',
//       required: true,
//       index: true
//     },
//     products: {
//       type: [saleItemSchema],
//       validate: {
//         validator: function (val) {
//           return val && val.length > 0;
//         },
//         message: 'Sale must contain at least one product',
//       },
//     },
//     subtotal: {
//       type: Number,
//       required: true,
//       min: [0, 'Subtotal cannot be negative'],
//     },
//     discountAmount: {
//       type: Number,
//       default: 0,
//       min: [0, "Global invoice discount cannot be negative."],
//     },
//     taxAmount: {
//       type: Number,
//       default: 0,
//       min: [0, "Global invoice tax cannot be negative."],
//     },
//     shippingCost: {
//       type: Number,
//       default: 0,
//       min: [0, "Shipping fees cannot be negative."],
//     },
//     grandTotal: {
//       type: Number,
//       required: true,
//       min: [0, "Grand total cannot be negative."],
//     },
    
//     paidAmount: {
//       type: Number,
//       required: true,
//       default: 0,
//       min: [0, 'Paid amount cannot be negative'],
//     },
//     dueAmount: {
//       type: Number,
//       required: true,
//       default: 0,
//       min: [0, 'Due amount cannot be negative'],
//     },
//     saleDate: {
//       type: Date,
//       required: true,
//       default: Date.now,
//       index: true,
//     },
//     items: [saleItemSchema],
//     itemCount: {
//       type: Number,
//       default: 0,
//     },
//     totalQuantity: {
//       type: Number,
//       default: 0,
//     },
//     paymentStatus: {
//       type: String,
//       enum: Object.values(PAYMENT_STATUS),
//       default: PAYMENT_STATUS.UNPAID,
//       index: true,
//     },
//     status: {
//       type: String,
//       enum: Object.values(SALE_STATUS),
//       default: SALE_STATUS.CONFIRMED,
//       index: true,
//     },
//     notes: {
//       type: String,
//       default: "",
//       trim: true,
//     },
//     createdBy: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     updatedBy: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       default: null,
//     },
//     isDeleted: {
//       type: Boolean,
//       default: false,
//       index: true,
//     },
//     deletedAt: {
//       type: Date,
//     },
//     deletedBy: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//     },
//   },
//   {
//     timestamps: true,
//     versionKey: false,
//   }
// );

// // Soft Delete Middleware Engine Layer
// saleSchema.query.withDeleted = function () {
//   return this.setOptions({ withDeleted: true });
// };

// saleSchema.pre(/^find/, function () {
//   if (!this.getOptions().withDeleted) {
//     this.where({ isDeleted: false });
//   }
// });

// // Indexes
// saleSchema.index({ invoiceNumber: 1 });
// saleSchema.index({ customerId: 1, paymentStatus: 1 });
// saleSchema.index({ warehouseId: 1, status: 1 });
// saleSchema.index({ saleDate: -1 });
// saleSchema.index({ isDeleted: 1 });

// // // Soft-delete middleware query filter
// // saleSchema.pre(/^find/, function (next) {
// //   if (this.getOptions().includeDeleted) {
// //     return next();
// //   }
// //   this.where({ isDeleted: { $ne: true } });
// //   next();
// // });

// export const Sale = model('Sale', saleSchema);



import mongoose from 'mongoose';
import { SALE_STATUS } from './sale.constants.js';

const saleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // What the customer pays
    unitCost: { type: Number, required: true, min: 0 },  // Snapshot of what it cost you to buy
    discount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const saleSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true, trim: true },
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true }, // Added link
    products: [saleItemSchema], // Restored from original named array structure
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 }, // Restored original naming
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    dueAmount: { type: Number, required: true, min: 0 },
    saleDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: Object.values(SALE_STATUS), default: SALE_STATUS.CONFIRMED },
    remarks: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

export const Sale = mongoose.model('Sale', saleSchema);

