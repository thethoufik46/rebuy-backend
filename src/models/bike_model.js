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

    /* ✅ LISTING OWNER */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ✅ LINKED USER (OPTIONAL) */
    sellerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BikeBrand",
      required: true,
    },

    model: {
      type: String,
      trim: true,
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },

    price: {
      type: Number,
      min: 0,
      default: null,
    },

    km: {
      type: Number,
      min: 0,
      default: null,
    },

    owner: {
      type: String,
      required: true,
    },

    insurance: {
      type: String,
      enum: ["comprehensive", "thirdparty", "no insurance"],
      default: null,
    },

    status: {
      type: String,
      enum: [
        "available",
        "booking",
        "sold",
        "draft",
        "delete_requested"
      ],
      default: "draft",
    },

    /* ✅ DISPLAY CONTACT */
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
      default: null,
    },

    description: {
      type: String,
      default: null,
    },

    bannerImage: {
      type: String,
      default: null,
    },

    galleryImages: {
      type: [String],
      default: [],
    },

    /* 🎙️ AUDIO NOTE */
    audioNote: {
      type: String,
      default: null,
    },

    /* 🎥 MULTIPLE VIDEOS */
    videos: {
      type: [String],
      default: [],
    },

    /* 🎥 EXTERNAL VIDEO LINK */
    videoLink: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

/* =====================================================
   PRE SAVE LOGIC
===================================================== */
bikeSchema.pre("save", async function (next) {
  try {
    /* 🔐 SELLER ENCRYPTION */
    if (this.seller) {
      this.seller = String(this.seller);

      if (!this.seller.includes(":")) {
        this.seller = encryptSeller(this.seller);
      }
    }

    /* 🔢 AUTO BIKE ID */
    if (!this.bikeId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "bikeId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.bikeId = counter.seq;
    }

    /* 📍 DISTRICT VALIDATION */
    const districtKey = Object.keys(locations).find(
      (d) => d.toLowerCase() === this.district.toLowerCase()
    );

    if (!districtKey) {
      throw new Error("Invalid district");
    }

    this.district = districtKey;

    /* 🏙️ CITY VALIDATION */
    if (this.city) {
      if (!locations[districtKey].includes(this.city)) {
        throw new Error("City does not belong to district");
      }
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
bikeSchema.index({ price: 1 });
bikeSchema.index({ year: 1 });
bikeSchema.index({ status: 1 });
bikeSchema.index({ district: 1 });
bikeSchema.index({ city: 1 });
bikeSchema.index({ createdBy: 1 });

export default mongoose.model("Bike", bikeSchema);