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

    /* ✅ LISTING OWNER 🔥 */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ✅ SMART SELLER LINKING 😎🔥 */
    sellerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // optional (admin listings etc)
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
      trim: false,
    },

    year: {
      type: Number,
      required: true,
    },

    price: {
      type: Number,
      min: 0,
      default: null, // ✅ Draft friendly
    },

    km: {
      type: Number,
      min: 0,
      default: null,
    },

    color: {
      type: String,
      trim: false,
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
      required: false,
    },

    status: {
      type: String,
      enum: ["available", "booking", "sold", "draft"],
      default: "draft",
    },

    /* ✅ DISPLAY CONTACT 🔥 */
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
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    bannerImage: {
      type: String,
      default: null,
    },

    galleryImages: [{ type: String }],

    audioNote: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

/* =====================================================
   PRE SAVE LOGIC
===================================================== */
carSchema.pre("save", async function (next) {
  try {
    /* 🔐 Encrypt Seller */
    if (this.seller && !this.seller.includes(":")) {
      this.seller = encryptSeller(this.seller);
    }

    /* 🔢 Auto Increment Car ID */
    if (!this.carId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "carId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.carId = counter.seq;
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

export default mongoose.model("Car", carSchema);
