// ======================= buyrequest_model.js =======================

import mongoose from "mongoose";

const buyRequestSchema = new mongoose.Schema(
  {
    // ============================================================
    // TYPE
    // ============================================================

    type: {
      type: String,
      required: true,
      enum: [
        "car",
        "bike",
        "property",
        "electronics",
      ],
      index: true,
    },

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

    // ============================================================
    // USER DETAILS
    // ============================================================

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

    location: {
      type: String,
      required: true,
      trim: true,
    },

    // ============================================================
    // CAR
    // ============================================================

    car: {
      model: {
        type: String,
        trim: true,
      },

      budget: {
        type: Number,
      },

      paymentType: {
        type: String,
        enum: [
          "Cash",
          "Finance",
        ],
      },

      boardType: {
        type: String,
        enum: [
          "Own Board",
          "T Board",
        ],
      },

      timeline: {
        type: String,
        enum: [
          "Immediate",
          "One Week",
          "15 Days",
        ],
      },
    },

    // ============================================================
    // BIKE
    // ============================================================

    bike: {
      model: {
        type: String,
        trim: true,
      },

      budget: {
        type: Number,
      },

      paymentType: {
        type: String,
        enum: [
          "Cash",
          "Finance",
        ],
      },

      timeline: {
        type: String,
        enum: [
          "Immediate",
          "One Week",
          "15 Days",
        ],
      },
    },

    // ============================================================
    // PROPERTY
    // ============================================================

    property: {
      category: {
        type: String,
        enum: [
          "Home",
          "Land",
        ],
      },

      preferredLocation: {
        type: String,
        trim: true,
      },

      budget: {
        type: Number,
      },

      timeline: {
        type: String,
        enum: [
          "Immediate",
          "One Week",
          "15 Days",
        ],
      },
    },

    // ============================================================
    // ELECTRONICS
    // ============================================================

    electronics: {
      category: {
        type: String,
        enum: [
          "Mobile",
          "Laptop",
          "PC",
        ],
      },

      budget: {
        type: Number,
      },

      timeline: {
        type: String,
        enum: [
          "Immediate",
          "One Week",
          "15 Days",
        ],
      },
    },

    // ============================================================
    // COMMON DESCRIPTION
    // ============================================================

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // ============================================================
    // AUDIO
    // R2 PUBLIC URL
    // ============================================================

    audioNote: {
      type: String,
      default: null,
      trim: true,
    },

    // ============================================================
    // ADMIN STATUS
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
      default: "",
      trim: true,
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

    // 24 hours after this time the request
    // can be permanently deleted.

    deleteExpiresAt: {
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

buyRequestSchema.index({
  user: 1,
  isDeleted: 1,
});

buyRequestSchema.index({
  isDeleted: 1,
  deleteExpiresAt: 1,
});

buyRequestSchema.index({
  type: 1,
  status: 1,
});

buyRequestSchema.index({
  createdAt: -1,
});

// ============================================================
// MODEL
// ============================================================

export default mongoose.model(
  "BuyRequest",
  buyRequestSchema
);