// C:\flutter_projects\rebuy-backend\src\models\electronics_model.js

import mongoose from "mongoose";
import Counter from "./counter_model.js";
import { encryptSeller } from "../utils/sellerCrypto.js";
import fs from "fs";
import path from "path";

/* =====================================================
   LOAD TAMIL NADU LOCATIONS
===================================================== */
const locationsPath = path.join(
  process.cwd(),
  "src/tamilnadu_locations.json"
);

const locations = JSON.parse(
  fs.readFileSync(locationsPath, "utf-8")
);

/* =====================================================
   ELECTRONICS SCHEMA
===================================================== */
const electronicsSchema = new mongoose.Schema(
  {
    /* 🔢 UNIQUE ID */
    electronicsId: {
      type: Number,
      unique: true,
      index: true,
    },

    /* 📱 CATEGORY */
    category: {
      type: String,
      enum: ["mobile", "laptop", "pc"],
      required: true,
      trim: true,
    },

    /* 👤 OWNER */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sellerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* 🏷️ BRAND (dynamic ref) */
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "brandModel",
    },

    brandModel: {
      type: String,
      enum: ["MobileBrand", "LaptopBrand", "PcBrand"],
    },

    /* 📄 BASIC INFO */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: null,
      trim: true,
    },

    /* 💰 PRICE */
    price: {
      type: Number,
      min: 0,
      default: null,
    },

    /* 📍 LOCATION */
    district: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      default: null,
      trim: true,
    },

    /* 🖼️ MEDIA */
    bannerImage: {
      type: String,
      default: null,
    },

    galleryImages: {
      type: [String],
      default: [],
    },

    audioNote: {
      type: String,
      default: null,
    },

    videos: {
      type: [String],
      default: [],
    },

    videoLink: {
      type: String,
      default: null,
    },

    /* 👤 SELLER */
    seller: {
      type: String,
      required: true,
      trim: true,
    },

    sellerinfo: {
      type: String,
      enum: ["Owner", "Dealer", "Verified"],
      required: true,
    },

    /* 📌 STATUS */
    status: {
      type: String,
      enum: ["available", "booking", "sold", "draft", "delete_requested"],
      default: "draft",
    },
  },
  { timestamps: true }
);

/* =====================================================
   PRE SAVE LOGIC
===================================================== */
electronicsSchema.pre("save", async function (next) {
  try {
    /* 🔐 SELLER ENCRYPT */
    if (this.seller) {
      this.seller = String(this.seller);

      if (!this.seller.includes(":")) {
        this.seller = encryptSeller(this.seller);
      }
    }

    /* 🔢 AUTO INCREMENT ID */
    if (!this.electronicsId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "electronicsId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.electronicsId = counter.seq;
    }

    /* 🔥 CATEGORY → BRAND MODEL */
    const categoryMap = {
      mobile: "MobileBrand",
      laptop: "LaptopBrand",
      pc: "PcBrand",
    };

    this.brandModel = categoryMap[this.category];

    if (!this.brandModel) {
      throw new Error("Invalid category for brand mapping");
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
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("Electronics", electronicsSchema);