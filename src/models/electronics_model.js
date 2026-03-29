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

    /* ✅ CATEGORY 🔥 */
    category: {
      type: String,
      enum: ["mobile", "laptop", "pc"],
      required: true,
      index: true,
    },

    /* ✅ OWNER */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sellerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* ✅ BRAND (dynamic based on category) */
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
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

    /* ✅ SELLER */
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

    /* ✅ STATUS */
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
  },
  { timestamps: true }
);

/* =====================================================
   PRE SAVE LOGIC
===================================================== */
electronicsSchema.pre("save", async function (next) {
  try {
    /* 🔐 SELLER SAFE */
    if (this.isModified("seller") && this.seller) {
      this.seller = String(this.seller);

      if (!this.seller.includes(":")) {
        this.seller = encryptSeller(this.seller);
      }
    }

    /* 🔢 AUTO ID */
    if (!this.electronicsId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "electronicsId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.electronicsId = counter.seq;
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
      const validCities = locations[districtKey].map((c) =>
        c.toLowerCase()
      );

      if (!validCities.includes(this.city.toLowerCase())) {
        throw new Error("City does not belong to district");
      }

      this.city = locations[districtKey].find(
        (c) => c.toLowerCase() === this.city.toLowerCase()
      );
    }

    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("Electronics", electronicsSchema);