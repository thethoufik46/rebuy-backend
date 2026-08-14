// ======================= buycar_model.js =======================

import mongoose from "mongoose";

const buyCarSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["car", "bike", "property", "electronics"],
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    userId: {
      type: String,
      required: true,
    },

    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },

    car: {
      model: String,
      budget: Number,
      paymentType: {
        type: String,
        enum: ["Cash", "Finance"],
      },
      boardType: {
        type: String,
        enum: ["Own Board", "T Board"],
      },
      timeline: {
        type: String,
        enum: ["Immediate", "One Week", "15 Days"],
      },
    },

    bike: {
      model: String,
      budget: Number,
      paymentType: {
        type: String,
        enum: ["Cash", "Finance"],
      },
      timeline: {
        type: String,
        enum: ["Immediate", "One Week", "15 Days"],
      },
    },

    property: {
      category: {
        type: String,
        enum: ["Home", "Land"],
      },
      preferredLocation: String,
      budget: Number,
      timeline: {
        type: String,
        enum: ["Immediate", "One Week", "15 Days"],
      },
    },

    electronics: {
      category: {
        type: String,
        enum: ["Mobile", "Laptop", "PC"],
      },
      budget: Number,
      timeline: {
        type: String,
        enum: ["Immediate", "One Week", "15 Days"],
      },
    },

    description: {
      type: String,
      trim: true,
    },

    audioNote: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    adminNote: String,

    // ============================================================
    // RECENTLY DELETED / 24-HOUR RECOVERY
    // MongoDB TTL automatically removes the document 24 hours
    // after deletedAt is set.
    // ============================================================

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Exact 24-hour automatic permanent deletion.
// MongoDB TTL monitor normally checks approximately once per minute.
buyCarSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 }
);

buyCarSchema.index({ user: 1, isDeleted: 1, createdAt: -1 });
buyCarSchema.index({ type: 1, status: 1, isDeleted: 1 });

export default mongoose.model("BuyCar", buyCarSchema);
