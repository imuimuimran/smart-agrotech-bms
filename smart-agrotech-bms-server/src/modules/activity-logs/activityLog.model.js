import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // References your existing User model context
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // Optional for system events like LOGIN
    },
    description: {
      type: String,
      trim: true,
      default: '', // Presentation-friendly summary context
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null, // For structured contextual data (e.g., oldStatus, amount)
    },
    createdAt: {
      type: Date,
      default: Date.now, // Enforces automated server-side chronology
      required: true,
    },
    ipAddress: {
      type: String,
      default: null, // Explicitly marked as a future-use placeholder
    },
    device: {
      type: String,
      default: null, // Future-use placeholder
    },
    browser: {
      type: String,
      default: null, // Future-use placeholder
    },
  },
  {
    versionKey: false, // Cleaner document footprint since logs are append-only
    timestamps: false, // Managed manually via standard 'createdAt' declaration
  }
);

// Optimize performance for administrative read queries

activityLogSchema.index({ userId: 1 });
activityLogSchema.index({ module: 1 });
activityLogSchema.index({ createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema, 'activityLogs');
