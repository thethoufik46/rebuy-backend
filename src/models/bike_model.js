import mongoose from "mongoose";

const bikeSchema = new mongoose.Schema(
  {
    /* -------------------------------------------------
       🔗 Brand Reference (Bike Brand dropdown)
    ---------------------------------------------------*/
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BikeBrand",
      required: true,
    },

    /* -------------------------------------------------
       🏍️ Basic Details
    ---------------------------------------------------*/
    model: {
      type: String,
      required: true,
      trim: true,
    },

    year: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    km: {
      type: Number,
      required: true,
      min: 0,
    },

    /* -------------------------------------------------
       👤 Owner & Status
    ---------------------------------------------------*/
    owner: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["available", "booking", "sold"],
      default: "available",
    },

    /* -------------------------------------------------
       🧑 Seller Details
    ---------------------------------------------------*/
    seller: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    sellerinfo: {
      type: String,
      enum: ["Rc owner", "Dealer", "Verified"],
      required: true,
    },

    /* -------------------------------------------------
       📝 Description
    ---------------------------------------------------*/
    description: {
      type: String,
      trim: true,
    },

    /* -------------------------------------------------
       🖼️ Images
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
   ⚡ Indexes
---------------------------------------------------*/
bikeSchema.index({ brand: 1 });
bikeSchema.index({ model: 1 });
bikeSchema.index({ price: 1 });
bikeSchema.index({ year: 1 });
bikeSchema.index({ status: 1 });
bikeSchema.index({ seller: 1 });
bikeSchema.index({ location: 1 });
bikeSchema.index({ sellerinfo: 1 });

export default mongoose.model("Bike", bikeSchema);
