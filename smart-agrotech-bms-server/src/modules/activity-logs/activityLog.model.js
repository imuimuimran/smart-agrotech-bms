import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // References your existing decentralized User model
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
    timestamp: {
      type: Date,
      default: Date.now, // Enforces server-side generation
      required: true,
    },
    ipAddress: {
      type: String,
      default: null, // Explicitly marked as a future-use placeholder
    },
  },
  {
    versionKey: false, // Cleaner document footprint since logs are append-only
  }
);

// Optimize performance for administrative read queries
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ module: 1, timestamp: -1 });
activityLogSchema.index({ entityId: 1, timestamp: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema, 'activityLogs');
