// ======================= sellproperty.model.js =======================
import mongoose from "mongoose";

const sellPropertySchema = new mongoose.Schema(
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
       PROPERTY TYPE (DROPDOWN)
    ========================= */
    propertyType: {
      type: String,
      required: true,
      enum: [
        "Residential Building",
        "Commercial Building",
        "Rental Income Building",
        "Commercial Land",
        "Agri Land",
        "Residential Plots",
      ],
      index: true,
    },

    /* =========================
       PROPERTY DETAILS
    ========================= */
    area: {
      type: String, // sqft / cent / acre
      required: true,
      trim: true,
    },

    direction: {
      type: String, // East / West / North / South
      trim: true,
    },

    roadAccess: {
      type: String, // 20ft road, 30ft road
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },

    /* =========================
       SELLER TYPE
    ========================= */
    sellerType: {
      type: String,
      required: true,
      enum: ["Owner", "Refer", "Agency"],
      index: true,
    },

    /* =========================
       DESCRIPTION
    ========================= */
    description: {
      type: String,
      trim: true,
    },

    /* =========================
       REQUIRED IMAGE
    ========================= */
    image: {
      type: String,
      required: true,
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
  },
  { timestamps: true }
);

export default mongoose.model("SellProperty", sellPropertySchema);
