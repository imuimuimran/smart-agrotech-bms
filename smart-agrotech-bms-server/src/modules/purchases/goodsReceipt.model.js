import mongoose from 'mongoose';
import { 
  GRN_STATUS,
  GRN_LIFECYCLE, 
  GRN_INSPECTION, 
  GRN_POSTING, 
  PRODUCT_CONDITIONS, 
} from './purchase.constants.js';

const Schema = mongoose.Schema;

const GoodsReceiptItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productNameSnapshot: { type: String, required: true },
  skuSnapshot: { type: String, required: true },
  quantityReceived: { type: Number, required: true, min: [1, 'Received quantity must be at least 1'] },
  orderedQuantity: { type: Number, required: true },  // Extracted from original PO baseline for verification (9.8.38)
  receivedQuantity: { type: Number, required: true, min: [0, 'Cannot receive negative stock'] }, // Raw physical arrive count (9.8.17)
  acceptedQuantity: { type: Number, default: 0 },     // Passed quality control (9.8.17)
  rejectedQuantity: { type: Number, default: 0 },     // Damaged/Incorrect count for returns (9.8.17, 9.8.18)
  unitCost: { type: Schema.Types.Decimal128, required: true }, // Derived from PO; never trusted from frontend (9.8.42)
  warehouseLocation: { type: String },                 // Storage tracking indicator (9.8.29)
  batchNumber: { type: String },                       // Lot traceability for product recalls (9.8.26)
  serialNumbers: [{ type: String }],                  // Unique identifier tracking array (9.8.25)
  condition: { type: String, enum: PRODUCT_CONDITIONS, default: 'NEW' }, // Visual check (9.8.27)
  notes: { type: String }
}, { _id: false });

// Quality Inspection Record Sub-schema
const InspectionRecordSchema = new Schema({
  inspectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  inspectedAt: { type: Date, default: Date.now },
  result: { type: String, enum: Object.values(GRN_INSPECTION), required: true },
  checklist: [{
    criterion: { type: String, required: true }, // e.g., 'Packaging Intact', 'Specs Match'
    passed: { type: Boolean, required: true }
  }],
  notes: { type: String }
}, { _id: false });

const GoodsReceiptSchema = new Schema({
  receiptNumber: { type: String, required: true, unique: true, index: true },
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', index: true },
  purchaseOrderVersion: { type: Number, default: 1, required: true },
  purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase', required: true, index: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
  supplierDeliveryReference: { type: String, required: true },
  receivedDate: { type: Date, default: Date.now, index: true },
  items: [GoodsReceiptItemSchema], // Line items physically checked into the building
  inspection: InspectionRecordSchema,
  attachments: [{ type: String }],
  status: { type: String, enum: Object.values(GRN_LIFECYCLE), default: GRN_LIFECYCLE.DRAFT, index: true },
  inspectionStatus: { type: String, enum: Object.values(GRN_INSPECTION), default: GRN_INSPECTION.PENDING, index: true },
  postingStatus: { type: String, enum: Object.values(GRN_POSTING), default: GRN_POSTING.NOT_POSTED, index: true },
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receivedAt: { type: Date, required: true, default: Date.now },
  postedAt: { type: Date }, 
  notes: { type: String }
}, { timestamps: true });

export const GoodsReceipt = mongoose.model('GoodsReceipt', GoodsReceiptSchema);
