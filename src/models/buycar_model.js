import mongoose from "mongoose";

const buyCarSchema = new mongoose.Schema(
  {
    /* =====================================================
       TYPE
    ===================================================== */

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

    /* =====================================================
       USER
    ===================================================== */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    userId: {
      type: String,
      required: true,
    },

    /* =====================================================
       USER DETAILS
    ===================================================== */

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

    /* =====================================================
       CAR
    ===================================================== */

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
        enum: [
          "Immediate",
          "One Week",
          "15 Days",
        ],
      },
    },

    /* =====================================================
       BIKE
    ===================================================== */

    bike: {
      model: String,

      budget: Number,

      paymentType: {
        type: String,
        enum: ["Cash", "Finance"],
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

    /* =====================================================
       PROPERTY
    ===================================================== */

    property: {
      category: {
        type: String,
        enum: ["Home", "Land"],
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

    /* =====================================================
       ELECTRONICS
    ===================================================== */

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

    /* =====================================================
       COMMON
    ===================================================== */

    description: {
      type: String,
      trim: true,
      default: "",
    },

    /*
     * IMPORTANT:
     * This must contain R2 PUBLIC URL.
     *
     * Example:
     * https://cdn.example.com/buycar/audio/xxx.m4a
     */

    audioNote: {
      type: String,
      default: null,
      trim: true,
    },

    /* =====================================================
       ADMIN
    ===================================================== */

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
  },

  {
    timestamps: true,
  }
);

/* =====================================================
   INDEXES
===================================================== */

buyCarSchema.index({
  user: 1,
  createdAt: -1,
});

buyCarSchema.index({
  type: 1,
  status: 1,
});

export default mongoose.model(
  "BuyCar",
  buyCarSchema
);