import mongoose from "mongoose";

const buyCarSchema = new mongoose.Schema(
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
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },

    /* =========================
       BUY REQUIREMENT
    ========================= */
    model: { type: String, required: true, trim: true },

    budget: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentType: {
      type: String,
      required: true,
      enum: ["Cash", "Finance"],
    },

    boardType: {
      type: String,
      required: true,
      enum: ["Own Board", "T Board"],
    },

    timeline: {
      type: String,
      required: true,
      enum: ["Immediate", "One Week", "15 Days"],
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

export default mongoose.model("BuyCar", buyCarSchema);
