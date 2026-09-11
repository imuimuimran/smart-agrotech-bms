// import mongoose from 'mongoose';

// const { Schema, model } = mongoose;

// const productWarehouseStockSchema = new mongoose.Schema(
//   {
//     productId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Product',
//       required: true,
//       index: true,
//     },
//     warehouseId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Warehouse',
//       required: true,
//       index: true,
//     },
//     physicalOnHand: {
//       type: Number,
//       required: true,
//       default: 0,
//       min: [0, 'Physical stock cannot drop below zero.'],
//     },
//     reservedStock: {
//       type: Number,
//       required: true,
//       default: 0,
//       min: [0, 'Reserved stock cannot drop below zero.'],
//     },
//     availableStock: {
//       type: Number,
//       required: true,
//       default: 0,
//       min: [0, 'Available stock cannot drop below zero.'],
//     },
//   },
//   {
//     timestamps: true,
//     versionKey: false,
//   }
// );

// // Critical integrity protection: Prevent duplicate mapping entries for the same product + warehouse
// productWarehouseStockSchema.index({ productId: 1, warehouseId: 1 }, { unique: true });

// // Auto-calculate availableStock before database writes
// productWarehouseStockSchema.pre('save', function (next) {
//   this.availableStock = this.physicalOnHand - this.reservedStock; // Invariant calculation boundary
//   if (this.availableStock < 0) {
//     return next(new Error('Validation Failure: Reserved stock cannot exceed physical stock volume.'));
//   }
//   next();
// });

// export const ProductWarehouseStock = mongoose.model(
//   'ProductWarehouseStock', 
//   productWarehouseStockSchema, 
//   'productWarehouseStocks'
// );




import mongoose from "mongoose";

const { Schema, model } = mongoose;

const productWarehouseStockSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    physicalOnHand: {
      type: Number,
      required: true,
      min: [0, "Physical stock cannot drop below zero."],
      default: 0,
    },
    reservedStock: {
      type: Number,
      required: true,
      min: [0, "Reserved stock cannot drop below zero."],
      default: 0,
    },
    availableStock: {
      type: Number,
      required: true,
      min: [0, "Available stock cannot drop below zero."],
      default: 0,
    },
    averageUnitCost: {
      type: Schema.Types.Decimal128,
      required: true,
      min: [0, "Weighted average unit cost cannot be negative."],
      default: mongoose.Types.Decimal128.fromString("0.00"),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound Unique constraint to block duplication drift
productWarehouseStockSchema.index(
  { productId: 1, warehouseId: 1 },
  { unique: true }
);

productWarehouseStockSchema.index({
  warehouseId: 1,
  availableStock: 1,
});

export const ProductWarehouseStock = model(
  "ProductWarehouseStock",
  productWarehouseStockSchema
);
