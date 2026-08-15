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
      model: String,

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
      model: String,

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

      preferredLocation: String,

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

       IMPORTANT:
       Store the R2 PUBLIC URL here.

       Example:
       https://your-r2-domain.com/buycar/audio/file.m4a
    ============================================================ */

    audioNote: {
      type: String,
      default: null,
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

    /*
      false = normal active request
      true  = Recently Deleted
    */
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    /*
      Exact time when user deleted the request.
    */
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    /*
      Exact time when 24-hour recovery period ends.
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

/*
  Fast My Needs query
*/
buyCarSchema.index({
  user: 1,
  isDeleted: 1,
});

/*
  Useful for expired soft-delete cleanup
*/
buyCarSchema.index({
  isDeleted: 1,
  deleteExpiresAt: 1,
});

/*
  Latest requests first
*/
buyCarSchema.index({
  createdAt: -1,
});

export default mongoose.model(
  "BuyCar",
  buyCarSchema
);