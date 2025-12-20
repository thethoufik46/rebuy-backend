import mongoose from "mongoose";

const carSchema = new mongoose.Schema(
  {
    /* -------------------------------------------------
       🔗 Brand Reference
    ---------------------------------------------------*/
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

    /* -------------------------------------------------
       🚗 Basic Details
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

    color: {
      type: String,
      required: true,
      trim: true,
    },

    /* -------------------------------------------------
       ⛽ Engine & Drive
    ---------------------------------------------------*/
    fuel: {
      type: String,
      enum: ["petrol", "diesel", "cng", "lpg", "electric"],
      required: true,
    },

    transmission: {
      type: String,
      enum: ["manual", "automatic"],
      required: true,
    },

    owner: {
      type: String,
      required: true,
    },

    board: {
      type: String,
      enum: ["own", "t board"],
      required: true,
    },

    /* -------------------------------------------------
       🛡️ Insurance & Status
    ---------------------------------------------------*/
    insurance: {
      type: String,
      enum: ["comprehensive", "thirdparty", "no insurance"],
      required: true,
    },

    status: {
      type: String,
      enum: ["available", "booking", "sold"],
      default: "available",
    },

    /* -------------------------------------------------
       🧑 Seller Info (✅ NEW ENUM FIELD)
    ---------------------------------------------------*/
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
carSchema.index({ brand: 1 });
carSchema.index({ model: 1 });
carSchema.index({ price: 1 });
carSchema.index({ year: 1 });
carSchema.index({ status: 1 });
carSchema.index({ sellerinfo: 1 }); // ✅ OPTIONAL BUT GOOD

export default mongoose.model("Car", carSchema);
