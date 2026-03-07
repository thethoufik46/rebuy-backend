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

        "Residential / Layout Plot (வீட்டு நிலம் / லேஅவுட் பிளாட் விற்பனை)",
        "Agricultural Land (விவசாய நிலம் விற்பனை)",
        "DTCP / CMDA Approved Plot (அங்கீகரிக்கப்பட்ட நிலம் விற்பனை)",
        "Farm Land (பண்ணை நிலம் விற்பனை)",
        "Industrial Land (தொழிற்துறை நிலம் விற்பனை)",

        "House (வீடு விற்பனை)",
        "Villa (வில்லா விற்பனை)",
        "Apartment (அபார்ட்மெண்ட் விற்பனை)",
        "Flat (பிளாட் விற்பனை)",
        "Farm House (பண்ணை வீடு விற்பனை)",

        "Commercial Building (வணிக கட்டிடம் விற்பனை)",
        "Shop (கடை விற்பனை)",
        "Office (அலுவலகம் விற்பனை)",
        "Warehouse / Godown (கிடங்கு விற்பனை)",
        "Factory (தொழிற்சாலை விற்பனை)",

        "Rental House (வாடகை வீடு விற்பனை)",
        "Rental Apartment (வாடகை அபார்ட்மெண்ட் விற்பனை)",
        "Rental Shop (வாடகை கடை விற்பனை)",
        "Rental Office (வாடகை அலுவலகம் விற்பனை)"

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
      type: String,
     enum: ["1","2","3","4","5","6","7","8","9","10+"],
      default: null,
    },

    landArea: {
      type: String,
      default: null,
    },

    homeArea: {
      type: String,
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
      enum: [
        "East Facing (கிழக்கு நோக்கு)",
        "West Facing (மேற்கு நோக்கு)",
        "North Facing (வடக்கு நோக்கு)",
        "South Facing (தெற்கு நோக்கு)",
        "North-East Facing (வடகிழக்கு நோக்கு)",
        "North-West Facing (வடமேற்கு நோக்கு)",
        "South-East Facing (தென்கிழக்கு நோக்கு)",
        "South-West Facing (தென்மேற்கு நோக்கு)"
      ],
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