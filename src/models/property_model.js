import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    /* -------------------------------------------------
       🏷️ MAIN TYPE (1st Dropdown)
    ---------------------------------------------------*/
    mainType: {
      type: String,
      enum: ["building", "land"],
      required: true,
    },

    /* -------------------------------------------------
       🏘️ CATEGORY (2nd Dropdown)
       (same values – logic frontend based on mainType)
    ---------------------------------------------------*/
    category: {
      type: String,
      enum: ["residential", "commercial", "rental_income"],
      required: true,
    },

    /* -------------------------------------------------
       📌 BASIC DETAILS
    ---------------------------------------------------*/
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    yearBuilt: {
      type: Number,
    },

    bedrooms: {
      type: Number, // eg: 1,2,3
    },

    /* -------------------------------------------------
       📐 AREA DETAILS
    ---------------------------------------------------*/
    landArea: {
      type: Number, // sqft / cent (mention in UI)
    },

    homeArea: {
      type: Number, // built-up area
    },

    /* -------------------------------------------------
       🛣️ ACCESS & DIRECTION
    ---------------------------------------------------*/
    roadAccess: {
      type: String, // 20ft road, 30ft road etc
      trim: true,
    },

    direction: {
      type: String, // East, West, North, South
      trim: true,
    },

    /* -------------------------------------------------
       📍 LOCATION
    ---------------------------------------------------*/
    location: {
      type: String,
      required: true,
      trim: true,
    },

    /* -------------------------------------------------
       🏷️ STATUS
    ---------------------------------------------------*/
    status: {
      type: String,
      enum: ["available", "booking", "sold"],
      default: "available",
    },

    /* -------------------------------------------------
       🧑 SELLER DETAILS
    ---------------------------------------------------*/
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

    /* -------------------------------------------------
       📝 DESCRIPTION
    ---------------------------------------------------*/
    description: {
      type: String,
      trim: true,
    },

    /* -------------------------------------------------
       🖼️ IMAGES
    ---------------------------------------------------*/
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

/* -------------------------------------------------
   ⚡ INDEXES (FILTER PERFORMANCE)
---------------------------------------------------*/
propertySchema.index({ mainType: 1 });
propertySchema.index({ category: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ location: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ sellerInfo: 1 });
propertySchema.index({ bedrooms: 1 });

export default mongoose.model("Property", propertySchema);
