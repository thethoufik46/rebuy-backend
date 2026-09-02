// ======================= bike_model_model.js =======================

import mongoose from "mongoose";

const bikeModelSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BikeBrand",
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

const BikeModel = mongoose.model(
  "BikeModel",
  bikeModelSchema,
  "bikemodels"
);

export default BikeModel;