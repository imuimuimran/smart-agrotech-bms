import mongoose from 'mongoose';

const Schema = mongoose.Schema;

// System Core Payment Channels Matrix Mapping (Page 1, 6)
export const SUPPORTED_PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Rocket', 'Cheque'];

const PurchasePaymentSchema = new Schema({
  paymentNumber: { type: String, required: true, unique: true, index: true }, // e.g., PMT-2026-000001
  accountsPayableId: { type: Schema.Types.ObjectId, ref: 'AccountsPayable', required: true, index: true }, // AP Linkage
  purchaseInvoiceId: { type: Schema.Types.ObjectId, ref: 'PurchaseInvoice', required: true, index: true },
  purchaseId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true }, // Legacy compatibility link (Page 3)
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },      // Legacy compatibility link (Page 3)
  
  amount: { 
    type: Schema.Types.Decimal128, 
    required: true,
    validate: {
      validator: (val) => Number(val.toString()) > 0, // Rule: Payment must be positive (Page 4, 20)
      message: 'Settlement error: Payment distribution sum must be greater than zero.'
    }
  },
  paymentMethod: { type: String, enum: SUPPORTED_PAYMENT_METHODS, required: true }, // Page 1, 6
  reference: { type: String, trim: true }, // Txn ID, Cheque number, Bank slip tracing keys (Page 1, 7)
  comment: { type: String, trim: true },   // Business note trace (Page 1, 7)
  
  idempotencyKey: { type: String, unique: true, sparse: true }, // Network Retry Guardrail (Page 11-12)
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Admin agent footprint (Page 8)
  paymentDate: { type: Date, default: Date.now, required: true, index: true } // Page 3, 8
}, { timestamps: true });

export const PurchasePayment = mongoose.model('PurchasePayment', PurchasePaymentSchema);
