// ======================= car_model_model.js =======================

import mongoose from "mongoose";

const carModelSchema = new mongoose.Schema(
  {
    // ============================================================
    // CAR BRAND
    // ============================================================

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarBrand",
      required: true,
    },

    // ============================================================
    // CAR MODEL NAME
    // ============================================================

    title: {
      type: String,
      required: true,
      trim: true,
    },

    // ============================================================
    // CAR MODEL IMAGE
    // ============================================================

    imageUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// IMPORTANT
// MONGODB COLLECTION = carmodels
// ============================================================

const CarModel = mongoose.model(
  "CarModel",
  carModelSchema,
  "carmodels"
);

export default CarModel;