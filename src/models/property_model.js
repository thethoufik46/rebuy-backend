import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    mainType: {
      type: String,
      enum: ["building", "land"],
      required: true,
    },

    category: {
      type: String,
      enum: ["residential", "commercial", "rental_income"],
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    yearBuilt: {
      type: Number,
    },

    bedrooms: {
      type: Number,
    },

    landArea: {
      type: Number,
    },

    homeArea: {
      type: Number,
    },

    roadAccess: {
      type: String,
      trim: true,
    },

    direction: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["available", "booking", "sold"],
      default: "available",
    },

    seller: {
      type: String,
      required: true,
      trim: true,
    },

    sellerInfo: {
      type: String,
      enum: ["Owner", "Verified Company", "Mediator"],
      required: true,
    },

    description: {
      type: String,
      trim: true,
    },

    bannerImage: {
      type: String,
      required: true,
    },

    galleryImages: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

propertySchema.index({ mainType: 1 });
propertySchema.index({ category: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ location: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ sellerInfo: 1 });
propertySchema.index({ bedrooms: 1 });

export default mongoose.model("Property", propertySchema);
