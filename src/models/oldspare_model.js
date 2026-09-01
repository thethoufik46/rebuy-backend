// ============================================================
// oldspare_model.js
// OLD SPARE WANT MODEL
// ============================================================

import mongoose from "mongoose";

const oldSpareSchema = new mongoose.Schema(
  {
    // ============================================================
    // USER
    // ============================================================

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // ============================================================
    // SPARE NAME
    // MAX 30 CHARACTERS
    // ============================================================

    spareName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    // ============================================================
    // CATEGORY
    // ============================================================

    category: {
      type: String,
      required: true,
      enum: [
        "car",
        "bike",
        "load_vehicle",
      ],
      index: true,
    },

    // ============================================================
    // DESCRIPTION
    // MAX 200 CHARACTERS
    // ============================================================

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },

    // ============================================================
    // OLD SPARE IMAGE
    // R2 PUBLIC URL
    // ============================================================

    oldSpareImage: {
      type: String,
      required: true,
      trim: true,
    },

    // ============================================================
    // STATUS
    // ============================================================

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
      ],
      default: "pending",
      index: true,
    },

    adminNote: {
      type: String,
      trim: true,
      default: "",
    },

    // ============================================================
    // SOFT DELETE
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
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

oldSpareSchema.index({
  user: 1,
  isDeleted: 1,
});

oldSpareSchema.index({
  category: 1,
  status: 1,
});

oldSpareSchema.index({
  createdAt: -1,
});

// ============================================================
// MODEL
// ============================================================

export default mongoose.model(
  "OldSpare",
  oldSpareSchema
);