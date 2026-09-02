// ======================= car_variant_model.js =======================

import mongoose from "mongoose";

const carVariantSchema =
  new mongoose.Schema(
    {
      carModel: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "CarModel",

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
// MongoDB collection = carvariants

const CarVariant =
  mongoose.model(
    "CarVariant",
    carVariantSchema,
    "carvariants"
  );

export default CarVariant;