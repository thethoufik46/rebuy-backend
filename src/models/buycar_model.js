// ======================= buycar_model.js =======================

import mongoose from "mongoose";

const buyCarSchema = new mongoose.Schema(
  {
    /* ============================================================
       TYPE
    ============================================================ */

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

    /* ============================================================
       USER
    ============================================================ */

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

    /* ============================================================
       USER DETAILS
    ============================================================ */

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

    /* ============================================================
       CAR
    ============================================================ */

    car: {
      model: {
        type: String,
        trim: true,
      },

      budget: Number,

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

    /* ============================================================
       BIKE
    ============================================================ */

    bike: {
      model: {
        type: String,
        trim: true,
      },

      budget: Number,

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

    /* ============================================================
       PROPERTY
    ============================================================ */

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

      budget: Number,

      timeline: {
        type: String,
        enum: [
          "Immediate",
          "One Week",
          "15 Days",
        ],
      },
    },

    /* ============================================================
       ELECTRONICS
    ============================================================ */

    electronics: {
      category: {
        type: String,
        enum: [
          "Mobile",
          "Laptop",
          "PC",
        ],
      },

      budget: Number,

      timeline: {
        type: String,
        enum: [
          "Immediate",
          "One Week",
          "15 Days",
        ],
      },
    },

    /* ============================================================
       COMMON
    ============================================================ */

    description: {
      type: String,
      trim: true,
      default: "",
    },

    /* ============================================================
       AUDIO
       R2 PUBLIC URL
    ============================================================ */

    audioNote: {
      type: String,
      default: null,
      trim: true,
    },

    /* ============================================================
       ADMIN STATUS
    ============================================================ */

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

    /* ============================================================
       SOFT DELETE
    ============================================================ */

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

    /*
      24 HOURS AFTER THIS TIME:
      document becomes permanently deleted.
    */

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

/* ============================================================
   INDEXES
============================================================ */

buyCarSchema.index({
  user: 1,
  isDeleted: 1,
});

buyCarSchema.index({
  isDeleted: 1,
  deleteExpiresAt: 1,
});

buyCarSchema.index({
  createdAt: -1,
});

export default mongoose.model(
  "BuyCar",
  buyCarSchema
);