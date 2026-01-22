import mongoose from "mongoose";
import Counter from "./counter_model.js";
import { encryptSeller } from "../utils/sellerCrypto.js";

const carSchema = new mongoose.Schema(
  {
    carId: {
      type: Number,
      unique: true,
      index: true,
    },

    /* -------------------------------------------------
       🔗 Brand Reference
    ---------------------------------------------------*/
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

    model: {
      type: String,
      required: true,
      trim: true,
    },

    year: {
      type: Number,
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
       🔐 SELLER (ENCRYPTED)
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

/* =================================================
   🔐 ENCRYPT SELLER BEFORE SAVE
================================================== */
carSchema.pre("save", function (next) {
  if (this.isModified("seller")) {
    this.seller = encryptSeller(this.seller);
  }
  next();
});

/* =================================================
   🔥 AUTO INCREMENT CAR ID
================================================== */
carSchema.pre("save", async function (next) {
  if (this.carId) return next();

  const counter = await Counter.findByIdAndUpdate(
    { _id: "carId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.carId = counter.seq;
  next();
});

/* =================================================
   ⚡ INDEXES
================================================== */
carSchema.index({ brand: 1 });
carSchema.index({ model: 1 });
carSchema.index({ price: 1 });
carSchema.index({ year: 1 });
carSchema.index({ fuel: 1 });
carSchema.index({ transmission: 1 });
carSchema.index({ status: 1 });
carSchema.index({ location: 1 });
carSchema.index({ sellerinfo: 1 });

export default mongoose.model("Car", carSchema);
