import mongoose from "mongoose";
import fs from "fs";
import path from "path";

/* =====================================================
   LOAD TAMIL NADU DISTRICTS JSON
===================================================== */
const locationsPath = path.join(
  process.cwd(),
  "src/tamilnadu_locations.json"
);

const locations = JSON.parse(
  fs.readFileSync(locationsPath, "utf-8")
);

/* =====================================================
   USER SCHEMA
===================================================== */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    /* ✅ MULTIPLE PHONE NUMBERS */
    phone: [
      {
        type: String,
        required: true,
        trim: true,
        set: (v) => v?.toString().replace(/\s+/g, ""),
      }
    ],

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    category: {
      type: String,
      enum: ["buyer", "seller", "driver"],
      required: true,
    },

    /* 📍 DISTRICT DROPDOWN */
    district: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      default: "NA",
    },

    profileImage: {
      type: String,
      default: "",
    },

    forgotRequest: {
      type: Boolean,
      default: false,
    },

    forgotRequestAt: {
      type: Date,
      default: null,
    },

    requestedPassword: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

/* =====================================================
   DISTRICT VALIDATION
===================================================== */
userSchema.pre("save", function (next) {
  try {

    const districtKey = Object.keys(locations).find(
      (d) => d.toLowerCase() === this.district.toLowerCase()
    );

    if (!districtKey) {
      throw new Error("Invalid district");
    }

    this.district = districtKey;

    next();

  } catch (error) {
    next(error);
  }
});

/* =====================================================
   INDEXES
===================================================== */
userSchema.index({ district: 1 });
userSchema.index({ phone: 1 });

export default mongoose.model("User", userSchema);