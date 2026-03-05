// ======================= src/models/user_model.js =======================

import mongoose from "mongoose";
import fs from "fs";
import path from "path";

/* =====================================================
   LOAD TAMIL NADU DISTRICTS
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

  /* 📍 DISTRICT */

  district: {
    type: String,
    required: true,
    trim: true,
  },

  location: {
    type: String,
    default: "NA",
  },

  address: {
    type: String,
    default: "NA",
  },

  /* 🖼 PROFILE IMAGE */

  profileImage: {
    type: String,
    default: "",
  },

  /* 🔐 FORGOT PASSWORD */

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

userSchema.pre("save", async function (next) {

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

userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ district: 1 });
userSchema.index({ role: 1 });

export default mongoose.model("User", userSchema);