import mongoose from "mongoose";
import { WAREHOUSE_STATUS } from "./warehouse.constants.js";

const { Schema, model } = mongoose;

const warehouseSchema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    warehouseName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    warehouseCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    address: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    contactPerson: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30,
    },
    status: {
      type: String,
      enum: Object.values(WAREHOUSE_STATUS),
      default: WAREHOUSE_STATUS.ACTIVE,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: String,
      default: null,
    },
    createdBy: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

warehouseSchema.query.withDeleted = function () {
  return this.setOptions({ withDeleted: true });
};

warehouseSchema.pre(/^find/, function () {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: false });
  }
});

warehouseSchema.index({
  warehouseName: "text",
  warehouseCode: "text",
  description: "text",
});

warehouseSchema.index({ status: 1, isDeleted: 1 });

export const Warehouse = model("Warehouse", warehouseSchema);
