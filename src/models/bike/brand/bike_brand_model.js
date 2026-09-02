// ======================= bike_brand_model.js =======================

import mongoose from "mongoose";

const bikeBrandSchema = new mongoose.Schema(
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

const BikeBrand = mongoose.model(
  "BikeBrand",
  bikeBrandSchema,
  "bikebrands"
);

export default BikeBrand;