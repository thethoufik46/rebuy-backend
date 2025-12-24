// ======================= sellcar.model.js =======================
import mongoose from "mongoose";

const sellCarSchema = new mongoose.Schema(
  {
    /* 🔐 LOGIN USER (REFERENCE) */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* 🔑 LOGIN USER ID (EXPLICIT FIELD) */
    userId: {
      type: String,
      required: true,
      index: true,
    },

    /* =========================
       REQUIRED CONTACT
    ========================= */
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },

    /* =========================
       REQUIRED VEHICLE
    ========================= */
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1980 },
    fuelType: {
      type: String,
      required: true,
      enum: ["Petrol", "Diesel", "Electric", "CNG", "Hybrid"],
    },
    transmission: {
      type: String,
      required: true,
      enum: ["Manual", "Automatic"],
    },
    kmsDriven: { type: Number, required: true, min: 0 },

    /* =========================
       REQUIRED IMAGE
    ========================= */
    image: {
      type: String,
      required: true,
    },

    /* =========================
       CATEGORY (DROPDOWN)
    ========================= */
    category: {
      type: String,
      required: true,
      enum: ["RC Owner", "Mediator", "Refer", "Dealer"],
    },

    /* =========================
       DESCRIPTION
    ========================= */
    description: {
      type: String,
      trim: true,
    },

    /* =========================
       OPTIONAL
    ========================= */
    brand: { type: String, trim: true },
    variant: { type: String, trim: true },
    seater: { type: Number, min: 2, max: 10 },
    insuranceIdv: { type: String, trim: true },
    price: { type: Number, min: 0 },

    /* =========================
       ADMIN FLOW
    ========================= */
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SellCar", sellCarSchema);
