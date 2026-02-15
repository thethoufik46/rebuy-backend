import mongoose from "mongoose";
import Counter from "./counter_model.js";
import { encryptSeller } from "../utils/sellerCrypto.js";
import fs from "fs";
import path from "path";

/* =====================================================
   LOAD TAMIL NADU LOCATIONS JSON
===================================================== */
const locationsPath = path.join(
  process.cwd(),
  "src/tamilnadu_locations.json"
);

const locations = JSON.parse(
  fs.readFileSync(locationsPath, "utf-8")
);

/* =====================================================
   BIKE SCHEMA
===================================================== */
const bikeSchema = new mongoose.Schema(
  {
    bikeId: {
      type: Number,
      unique: true,
      index: true,
    },

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BikeBrand",
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

    owner: {
      type: String,
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

    galleryImages: [{ type: String }],
  },
  { timestamps: true }
);

/* =====================================================
   PRE SAVE LOGIC
===================================================== */
bikeSchema.pre("save", async function (next) {
  try {
    /* 🔐 Encrypt Seller */
    if (this.seller && !this.seller.includes(":")) {
      this.seller = encryptSeller(this.seller);
    }

    /* 🔢 Auto Increment Bike ID */
    if (!this.bikeId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "bikeId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.bikeId = counter.seq;
    }

    /* 📍 District Validation */
    const districtKey = Object.keys(locations).find(
      (d) => d.toLowerCase() === this.district.toLowerCase()
    );

    if (!districtKey) {
      throw new Error("Invalid district");
    }

    this.district = districtKey;

    /* 🏙️ City Validation */
    if (!locations[districtKey].includes(this.city)) {
      throw new Error("City does not belong to district");
    }

    next();
  } catch (error) {
    next(error);
  }
});

/* =====================================================
   INDEXES
===================================================== */
bikeSchema.index({ brand: 1 });
bikeSchema.index({ model: 1 });
bikeSchema.index({ price: 1 });
bikeSchema.index({ year: 1 });
bikeSchema.index({ status: 1 });
bikeSchema.index({ seller: 1 });
bikeSchema.index({ sellerinfo: 1 });
bikeSchema.index({ district: 1 });
bikeSchema.index({ city: 1 });

export default mongoose.model("Bike", bikeSchema);
