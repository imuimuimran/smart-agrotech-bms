// src/modules/settings/settings.model.js
import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: "SET-GLOBAL-001", // Enforces a single system-wide unified setup identifier configuration
    },
    // Company Information
    companyName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    companyEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    companyPhone: {
      type: String,
      trim: true,
      default: "",
    },
    companyAddress: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    companyTaxNumber: {
      type: String,
      trim: true,
      default: "",
    },
    // Business Logo
    businessLogo: {
      url: {
        type: String,
        trim: true,
        default: "",
      },
      publicId: {
        type: String,
        trim: true,
        default: "",
      },
    },
    // Invoice Settings
    invoiceSettings: {
      prefix: {
        type: String,
        trim: true,
        default: "INV",
      },
      footerText: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },
      showCompanyAddress: {
        type: Boolean,
        default: true,
      },
      showCompanyPhone: {
        type: Boolean,
        default: true,
      },
      showCompanyEmail: {
        type: Boolean,
        default: true,
      },
    },
    // Currency
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: "BDT",
    },
    // Time Zone
    timeZone: {
      type: String,
      trim: true,
      default: "Asia/Dhaka", // Calibrated exactly to local operational context timezones
    },
    // Backup Settings
    backupSettings: {
      enabled: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "weekly",
      },
      retentionDays: {
        type: Number,
        min: 1,
        default: 30,
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Enforce single system-wide asset configuration limits by querying index limits
settingsSchema.index({ publicId: 1 }, { unique: true });

// Convert standard default module export to strict explicit named export mapping structure
export const Settings = mongoose.model(
  "Settings",
  settingsSchema,
  "settings"
);
