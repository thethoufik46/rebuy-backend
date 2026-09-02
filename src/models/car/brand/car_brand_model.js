// ======================= car_brand_model.js =======================

import mongoose from "mongoose";

const carBrandSchema = new mongoose.Schema(
  {
    // ============================================================
    // CAR BRAND NAME
    // ============================================================

    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // ============================================================
    // CAR BRAND LOGO
    // ============================================================

    logoUrl: {
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
// MONGODB COLLECTION = carbrands
// ============================================================

const CarBrand = mongoose.model(
  "CarBrand",
  carBrandSchema,
  "carbrands"
);

export default CarBrand;