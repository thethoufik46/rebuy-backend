// ======================= car_variant_model.js =======================

import mongoose from "mongoose";

const carVariantSchema = new mongoose.Schema(
  {
    // ============================================================
    // CAR MODEL
    // ============================================================

    carModel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarModel",
      required: true,
    },

    // ============================================================
    // CAR VARIANT NAME
    // ============================================================

    title: {
      type: String,
      required: true,
      trim: true,
    },

    // ============================================================
    // CAR VARIANT IMAGE
    // IMAGE IS OPTIONAL
    // ============================================================

    imageUrl: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// IMPORTANT
// MongoDB collection = carvariants
// ============================================================

const CarVariant = mongoose.model(
  "CarVariant",
  carVariantSchema,
  "carvariants"
);

export default CarVariant;