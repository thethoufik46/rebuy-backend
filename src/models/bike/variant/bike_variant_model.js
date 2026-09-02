import mongoose from "mongoose";

const bikeVariantSchema = new mongoose.Schema(
  {
    bikeModel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BikeModel",
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

const BikeVariant = mongoose.model(
  "BikeVariant",
  bikeVariantSchema,
  "bikevariants"
);

export default BikeVariant;