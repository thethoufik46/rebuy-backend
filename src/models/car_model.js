import mongoose from "mongoose";
import Counter from "./counter_model.js";
import { encryptSeller } from "../utils/sellerCrypto.js";
import fs from "fs";
import path from "path";
const locationsPath = path.join(process.cwd(), "src/tamilnadu_locations.json");

const locations = JSON.parse(fs.readFileSync(locationsPath, "utf-8"));

const carSchema = new mongoose.Schema(
  {
    carId: {
      type: Number,
      unique: true,
      index: true,
    },

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: false,
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

    seller: {
      type: String,
      required: true,
      trim: true,
    },

    sellerinfo: {
      type: String,
      enum: ["Rc owner", "Dealer", "Verified"],
      required: true,
    },

    district: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
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

/* ===============================
   PRE SAVE LOGIC (ALL-IN-ONE)
================================ */
carSchema.pre("save", async function (next) {
  try {
    /* ✅ Seller Encryption */
    if (typeof this.seller === "string" && this.seller.trim()) {
      if (!this.seller.includes(":")) {
        this.seller = encryptSeller(this.seller);
      }
    }

    /* ✅ Auto Increment Car ID */
    if (!this.carId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "carId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.carId = counter.seq;
    }

    /* ✅ District Validation */
    if (!locations[this.district]) {
      throw new Error("Invalid district");
    }

    /* ✅ City Validation */
    if (!locations[this.district].includes(this.city)) {
      throw new Error("City does not belong to district");
    }

    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("Car", carSchema);
