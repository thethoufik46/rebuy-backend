import mongoose from "mongoose";
import Counter from "./counter_model.js";
import { encryptSeller } from "../utils/sellerCrypto.js";

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

    /* ✅ CATEGORY (MOBILE / LAPTOP / PC) */
    category: {
      type: String,
      enum: ["mobile", "laptop", "pc"],
      required: true,
    },

    /* ✅ OWNER */
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

    /* ✅ BRAND (dynamic based on category) */
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "brandModel",
    },

    brandModel: {
      type: String,
      required: true,
      enum: ["MobileBrand", "LaptopBrand", "PcBrand"],
    },

    /* ✅ BASIC INFO */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: null,
    },

    /* 💰 PRICE */
    price: {
      type: Number,
      min: 0,
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

    /* 🔢 AUTO ID */
    if (!this.electronicsId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "electronicsId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.electronicsId = counter.seq;
    }

    /* 🔥 CATEGORY → BRAND MODEL MAP */
    if (this.category === "mobile") {
      this.brandModel = "MobileBrand";
    } else if (this.category === "laptop") {
      this.brandModel = "LaptopBrand";
    } else if (this.category === "pc") {
      this.brandModel = "PcBrand";
    }

    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("Electronics", electronicsSchema);