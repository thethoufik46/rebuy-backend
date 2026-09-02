// ======================= car_brand_model.js =======================
// C:\flutter_projects\rebuy-backend\src\models\car\car_brand_model.js

import mongoose from "mongoose";

const carBrandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    logoUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// IMPORTANT:
// Explicit collection name = carbrands
const CarBrand = mongoose.model(
  "CarBrand",
  carBrandSchema,
  "carbrands"
);

export default CarBrand;