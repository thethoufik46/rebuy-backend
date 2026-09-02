// ======================= car_model_model.js =======================

import mongoose from "mongoose";

const carModelSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarBrand",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// IMPORTANT:
// Explicit collection name = carmodels
const CarModel = mongoose.model(
  "CarModel",
  carModelSchema,
  "carmodels"
);

export default CarModel;