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
   CAR SCHEMA
===================================================== */

const carSchema = new mongoose.Schema(
  {
    carId: {
      type: Number,
      unique: true,
      index: true,
    },

    /* =====================================================
       LISTING OWNER
    ===================================================== */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* =====================================================
       LINKED USER (OPTIONAL)
    ===================================================== */

    sellerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* =====================================================
       BRAND
    ===================================================== */

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

    /* =====================================================
       VARIANT
    ===================================================== */

    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      default: null,
    },

    /* =====================================================
       MODEL
    ===================================================== */

    model: {
      type: String,
      default: null,
    },

    /* =====================================================
       REGISTRATION STATE
       
       TN = Tamil Nadu (DEFAULT + FIRST)
       
       Example:
       TN 38
       PY 01
    ===================================================== */

    registrationState: {
      type: String,
      enum: [
        "TN",
        "AP",
        "AR",
        "AS",
        "BR",
        "CG",
        "GA",
        "GJ",
        "HR",
        "HP",
        "JH",
        "KA",
        "KL",
        "MP",
        "MH",
        "MN",
        "ML",
        "MZ",
        "NL",
        "OD",
        "PB",
        "RJ",
        "SK",
        "TS",
        "TR",
        "UP",
        "UK",
        "WB",
        "AN",
        "CH",
        "DN",
        "DL",
        "JK",
        "LA",
        "LD",
        "PY",
      ],
      default: "TN",
      required: true,
      uppercase: true,
      trim: true,
    },

    /* =====================================================
       REGISTRATION NUMBER

       Exactly 2 digits

       Example:
       01
       10
       38
       99
    ===================================================== */

    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{2}$/,
    },

    /* =====================================================
       YEAR
    ===================================================== */

    year: {
      type: Number,
      required: true,
    },

    /* =====================================================
       PRICE
    ===================================================== */

    price: {
      type: Number,
      min: 0,
      default: null,
    },

    /* =====================================================
       KM
    ===================================================== */

    km: {
      type: Number,
      min: 0,
      default: null,
    },

    /* =====================================================
       COLOR
    ===================================================== */

    color: {
      type: String,
      default: null,
    },

    /* =====================================================
       FUEL
    ===================================================== */

    fuel: {
      type: String,
      enum: [
        "petrol",
        "diesel",
        "cng",
        "lpg",
        "electric",
      ],
      required: true,
    },

    /* =====================================================
       TRANSMISSION
    ===================================================== */

    transmission: {
      type: String,
      enum: [
        "manual",
        "automatic",
      ],
      required: true,
    },

    /* =====================================================
       OWNER
    ===================================================== */

    owner: {
      type: String,
      required: true,
    },

    /* =====================================================
       BOARD
    ===================================================== */

    board: {
      type: String,
      enum: [
        "own",
        "t board",
      ],
      required: true,
    },

    /* =====================================================
       INSURANCE
    ===================================================== */

    insurance: {
      type: String,
      enum: [
        "comprehensive",
        "thirdparty",
        "no insurance",
      ],
      default: null,
    },

    /* =====================================================
       STATUS
    ===================================================== */

    status: {
      type: String,
      enum: [
        "available",
        "booking",
        "sold",
        "draft",
        "delete_requested",
      ],
      default: "draft",
    },

    /* =====================================================
       DISPLAY CONTACT
    ===================================================== */

    seller: {
      type: String,
      required: true,
      trim: true,
    },

    /* =====================================================
       SELLER INFO
    ===================================================== */

    sellerinfo: {
      type: String,
      enum: [
        "Rc owner",
        "Dealer",
        "Verified",
      ],
      required: true,
    },

    /* =====================================================
       DISTRICT
    ===================================================== */

    district: {
      type: String,
      required: true,
      trim: true,
    },

    /* =====================================================
       CITY
    ===================================================== */

    city: {
      type: String,
      default: null,
    },

    /* =====================================================
       DESCRIPTION
    ===================================================== */

    description: {
      type: String,
      default: null,
    },

    /* =====================================================
       BANNER IMAGE
    ===================================================== */

    bannerImage: {
      type: String,
      default: null,
    },

    /* =====================================================
       GALLERY IMAGES
    ===================================================== */

    galleryImages: {
      type: [String],
      default: [],
    },

    /* =====================================================
       AUDIO NOTE
    ===================================================== */

    audioNote: {
      type: String,
      default: null,
    },

    /* =====================================================
       APP VIDEO
    ===================================================== */

    videos: {
      type: [String],
      default: [],
    },

    /* =====================================================
       YOUTUBE VIDEO LINK
    ===================================================== */

    videoLink: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   PRE SAVE LOGIC
===================================================== */

carSchema.pre("save", async function (next) {
  try {
    /* =====================================================
       SELLER SAFETY
    ===================================================== */

    if (this.seller) {
      this.seller = String(this.seller);

      // Prevent double encryption
      if (!this.seller.includes(":")) {
        this.seller = encryptSeller(this.seller);
      }
    }

    /* =====================================================
       AUTO CAR ID
    ===================================================== */

    if (!this.carId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "carId" },
        { $inc: { seq: 1 } },
        {
          new: true,
          upsert: true,
        }
      );

      this.carId = counter.seq;
    }

    /* =====================================================
       REGISTRATION STATE VALIDATION
    ===================================================== */

    if (this.registrationState) {
      this.registrationState = String(
        this.registrationState
      )
        .trim()
        .toUpperCase();

      if (
        ![
          "TN",
          "AP",
          "AR",
          "AS",
          "BR",
          "CG",
          "GA",
          "GJ",
          "HR",
          "HP",
          "JH",
          "KA",
          "KL",
          "MP",
          "MH",
          "MN",
          "ML",
          "MZ",
          "NL",
          "OD",
          "PB",
          "RJ",
          "SK",
          "TS",
          "TR",
          "UP",
          "UK",
          "WB",
          "AN",
          "CH",
          "DN",
          "DL",
          "JK",
          "LA",
          "LD",
          "PY",
        ].includes(this.registrationState)
      ) {
        throw new Error(
          "Invalid registration state"
        );
      }
    }

    /* =====================================================
       REGISTRATION NUMBER VALIDATION

       Must contain exactly 2 digits
    ===================================================== */

    if (this.registrationNumber) {
      this.registrationNumber = String(
        this.registrationNumber
      ).trim();

      if (
        !/^[0-9]{2}$/.test(
          this.registrationNumber
        )
      ) {
        throw new Error(
          "Registration number must contain exactly 2 digits"
        );
      }
    }

    /* =====================================================
       DISTRICT VALIDATION
    ===================================================== */

    const districtKey = Object.keys(
      locations
    ).find(
      (d) =>
        d.toLowerCase() ===
        this.district.toLowerCase()
    );

    if (!districtKey) {
      throw new Error(
        "Invalid district"
      );
    }

    this.district = districtKey;

    /* =====================================================
       CITY VALIDATION
    ===================================================== */

    if (this.city) {
      if (
        !locations[districtKey].includes(
          this.city
        )
      ) {
        throw new Error(
          "City does not belong to district"
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

/* =====================================================
   EXPORT CAR MODEL
===================================================== */

export default mongoose.model(
  "Car",
  carSchema
);