// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import mongoose from "mongoose";
import Counter from "../counter_model.js";
import { encryptSeller } from "../../utils/sellerCrypto.js";
import fs from "fs";
import path from "path";
const locationsPath = path.join(
  process.cwd(),
  "src/tamilnadu_locations.json"
);
const locations = JSON.parse(
  fs.readFileSync(locationsPath, "utf-8")
);
const bikeSchema = new mongoose.Schema(
  {
    /* =====================================================
       BIKE ID
    ===================================================== */
    bikeId: {
      type: Number,
      unique: true,
      index: true,
    },
    /* =====================================================
       CREATED BY
    ===================================================== */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /* =====================================================
       SELLER USER
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
      ref: "BikeBrand",
      required: true,
      index: true,
    },
    /* =====================================================
       MODEL
    ===================================================== */
    model: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BikeModel",
      required: false,
      default: null,
      index: true,
    },
    /* =====================================================
       VARIANT
    ===================================================== */
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BikeVariant",
      required: false,
      default: null,
      index: true,
    },
    /* =====================================================
       REGISTRATION STATE
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
       EXACTLY 2 DIGITS
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
       SELLER
    ===================================================== */
    seller: {
      type: String,
      required: false,
      default: null,
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
       LOCATION
    ===================================================== */
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
    /* =====================================================
       DESCRIPTION
    ===================================================== */
    description: {
      type: String,
      default: null,
      trim: true,
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
       MEDIA
    ===================================================== */
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
      index: true,
    },
  },
  {
    timestamps: true,
  }
);
/* =====================================================
   PRE SAVE LOGIC
===================================================== */
bikeSchema.pre("save", async function (next) {
  try {
    /* =====================================================
       SELLER ENCRYPTION
    ===================================================== */
    if (this.seller) {
      this.seller = String(this.seller);
      if (!this.seller.includes(":")) {
        this.seller = encryptSeller(this.seller);
      }
    }
    /* =====================================================
       AUTO BIKE ID
    ===================================================== */
    if (!this.bikeId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "bikeId" },
        { $inc: { seq: 1 } },
        {
          new: true,
          upsert: true,
        }
      );
      this.bikeId = counter.seq;
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
      const validStates = [
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
      ];
      if (
        !validStates.includes(
          this.registrationState
        )
      ) {
        throw new Error(
          "Invalid registration state"
        );
      }
    }
    /* =====================================================
       REGISTRATION NUMBER VALIDATION
       EXACTLY 2 DIGITS
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
        String(this.district || "")
          .toLowerCase()
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
      const cityExists =
        locations[districtKey]?.includes(
          this.city
        );
      if (!cityExists) {
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
   INDEXES
===================================================== */
bikeSchema.index({ brand: 1 });
bikeSchema.index({ model: 1 });
bikeSchema.index({ variant: 1 });
bikeSchema.index({ price: 1 });
bikeSchema.index({ year: 1 });
bikeSchema.index({ km: 1 });
bikeSchema.index({ status: 1 });
bikeSchema.index({ district: 1 });
bikeSchema.index({ city: 1 });
bikeSchema.index({ createdBy: 1 });
bikeSchema.index({ sellerUser: 1 });
bikeSchema.index({ registrationState: 1 });
/* =====================================================
   EXPORT
===================================================== */
const Bike = mongoose.model(
  "Bike",
  bikeSchema,
  "bikes"
);
export default Bike;