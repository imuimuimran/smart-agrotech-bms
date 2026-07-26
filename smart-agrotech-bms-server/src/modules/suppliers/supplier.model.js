import mongoose from "mongoose";
const { Schema, model } = mongoose;
import { addressSchema } from "../../shared/schemas/address.schema.js";

const contactPersonSchema = new Schema({
  name: {
    type: String,
    required: [true, "Contact person name is required"],
    trim: true,
  },
  designation: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  }
}, {
  _id: false,
}); 

const bankAccountSchema = new Schema({
  bankName: {
    type: String,
    trim: true,
  },
  accountName: {
    type: String,
    trim: true,
  },
  accountNumber: {
    type: String,
    trim: true,
  },
  routingNumber: {
    type: String,
    trim: true,
  },
  branchName: {
    type: String,
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  }
}, {
  _id: false,
});

const supplierSchema = new Schema({
  publicId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  supplierName: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  supplierCode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  companyName: {
    type: String,
    trim: true,
    index: true,
  },
  supplierType: {
    type: String,
    required: true,
  },
  contactPerson: contactPersonSchema,
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    index: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  alternatePhone: {
    type: String,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  tradeLicenseNumber: {
    type: String,
    trim: true,
  },
  taxIdentificationNumber: {
    type: String,
    trim: true,
  },
  paymentTerms: {
    type: String,
    default: "Cash",
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: 0,
  },
  currentPayable: {
    type: Number,
    default: 0,
    min: 0,
  },
  currency: {
    type: String,
    default: "BDT",
  },
  bankAccounts: [bankAccountSchema],
  address: addressSchema,
  notes: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "blacklisted"],
    default: "active",
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
  createdBy: String,
  updatedBy: String,
  deletedBy: String,
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

supplierSchema.index({
  supplierName: "text",
  companyName: "text",
});

supplierSchema.index({ phone: 1 });
supplierSchema.index({ email: 1 });
supplierSchema.index({ supplierType: 1 });
supplierSchema.index({ status: 1 });
 
supplierSchema.virtual("availableCredit").get(function () {
  return this.creditLimit - this.currentPayable;
});

supplierSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: false });
  next();
});

const Supplier = model("Supplier", supplierSchema);

export default Supplier;

