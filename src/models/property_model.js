// ======================= src/models/property_model.js =======================

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

    yearBuilt: Number,
    bedrooms: Number,
    landArea: Number,
    homeArea: Number,

    roadAccess: {
      type: String,
      trim: true,
    },

    direction: {
      type: String,
      trim: true,
    },

    // ✅ FINAL FIX
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
  { timestamps: true }
);

export default mongoose.model("Property", propertySchema);
