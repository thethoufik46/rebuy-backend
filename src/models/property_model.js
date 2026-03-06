// ======================= src/models/property_model.js =======================

import mongoose from "mongoose";
import Counter from "./counter_model.js";
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

const propertySchema = new mongoose.Schema(
  {
    /* 🔢 AUTO PROPERTY ID */
    propertyId: {
      type: Number,
      unique: true,
      index: true,
    },

    /* 👤 CREATED BY */
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

    /* ==============================
       LOCATION 🔥
    ============================== */

    district: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      default: null,
      trim: false,
    },

    /* ==============================
       PROPERTY INFO
    ============================== */

    mainType: {
      type: String,
      enum: ["building", "land"],
      required: true,
    },

    category: {
      type: String,
      enum: [
        "Residential (வசிப்பிடம்)",
        "Commercial (வணிகம்)",
        "Rental Income (வாடகை வருமானம்)"
      ],
      required: true,
    },

    price: {
      type: Number,
      min: 0,
      default: null,
    },

    yearBuilt: {
      type: Number,
      default: null,
    },

    bedrooms: {
      type: Number,
      default: null,
    },

    landArea: {
      type: Number,
      default: null,
    },

    homeArea: {
      type: Number,
      default: null,
    },

    roadAccess: {
      type: String,
      trim: true,
      default: null,
    },

    direction: {
      type: String,
      trim: true,
      default: null,
    },
    /* ==============================
       STATUS FLOW
    ============================== */

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

    /* ==============================
       SELLER
    ============================== */

    seller: {
      type: String,
      required: true,
    },

    sellerInfo: {
      type: String,
      enum: ["Owner", "Verified Company", "Mediator"],
      required: true,
    },

    description: String,

    bannerImage: {
      type: String,
      default: null,
    },

    audioNote: {
      type: String,
      default: null,
    },

    galleryImages: {
      type: [String],
      default: [],
    },

    videos: {
      type: [String],
      default: [],
    },

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
propertySchema.pre("save", async function (next) {
  try {
    /* 🔢 AUTO PROPERTY ID */
    if (!this.propertyId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "propertyId" },
        { $inc: { seq: 1 } },
        {
          new: true,
          upsert: true
        }
      );

      this.propertyId = counter.seq;
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

export default mongoose.model("Property", propertySchema);