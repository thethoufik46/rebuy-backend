import mongoose from "mongoose";

const buyPropertySchema = new mongoose.Schema(
  {
    /* 🔐 LOGIN USER */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* 🔑 USER ID */
    userId: {
      type: String,
      required: true,
      index: true,
    },

    /* =========================
       CONTACT DETAILS
    ========================= */
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

    /* =========================
       PROPERTY REQUIREMENT
    ========================= */
    category: {
      type: String,
      required: true,
      enum: ["Residential", "Commercial"],
    },

    propertyType: {
      type: String,
      required: true,
      enum: ["Home", "Land"],
    },

    message: {
      type: String,
      trim: true,
    },

    /* =========================
       ADMIN FLOW
    ========================= */
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    adminNote: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("BuyProperty", buyPropertySchema);
