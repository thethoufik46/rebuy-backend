// ======================= models/sellcar_model.js =======================
import mongoose from "mongoose";
import Counter from "./counter_model.js";
import { encryptSeller } from "../utils/sellerCrypto.js";

const sellCarSchema = new mongoose.Schema(
  {
    sellCarId: {
      type: Number,
      unique: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

    model: { type: String, required: true, trim: true },

    year: { type: Number, required: true },

    price: { type: Number, required: true, min: 0 },

    km: { type: Number, required: true, min: 0 },

    color: { type: String, required: true, trim: true },

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

    owner: { type: String, required: true },

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

    seller: { type: String, required: true, trim: true },

    sellerinfo: {
      type: String,
      enum: ["Rc owner", "Dealer", "Verified"],
      required: true,
    },

    location: { type: String, required: true, trim: true },

    description: { type: String, trim: true },

    bannerImage: { type: String, required: true },

    galleryImages: [{ type: String }],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    adminNote: { type: String, trim: true },
  },
  { timestamps: true }
);

sellCarSchema.pre("save", function (next) {
  if (this.seller && !this.seller.includes(":")) {
    this.seller = encryptSeller(this.seller);
  }
  next();
});

sellCarSchema.pre("save", async function (next) {
  if (this.sellCarId) return next();

  const counter = await Counter.findByIdAndUpdate(
    { _id: "sellCarId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.sellCarId = counter.seq;
  next();
});

export default mongoose.model("SellCar", sellCarSchema);
