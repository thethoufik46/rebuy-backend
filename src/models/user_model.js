import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// =====================================================
// LOAD TAMIL NADU DISTRICTS JSON
// =====================================================

const locationsPath = path.join(
  process.cwd(),
  "src/tamilnadu_locations.json"
);

const locations = JSON.parse(
  fs.readFileSync(
    locationsPath,
    "utf-8"
  )
);

// =====================================================
// USER SCHEMA
// =====================================================

const userSchema = new mongoose.Schema(
  {
    // =================================================
    // BASIC
    // =================================================

  name: {
  type: String,
  required: true,
  trim: true,
  maxlength: 50,
},

    // =================================================
    // GOOGLE ACCOUNT DETAILS
    // =================================================

    googleName: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },

    googleProfileImage: {
      type: String,
      default: "",
      trim: true,
    },

    // =================================================
    // PHONE
    // SINGLE STRING
    // =================================================

    phone: {
      type: String,
      required: true,
      trim: true,
      set: (v) =>
        v
          ?.toString()
          .replace(/\s+/g, ""),
    },

    // =================================================
    // ALTERNATE PHONE
    // =================================================

    alternatePhone: {
      type: String,
      default: "",
      trim: true,
      set: (v) =>
        v
          ?.toString()
          .replace(/\s+/g, ""),
    },

    // =================================================
    // PASSWORD
    // =================================================

    password: {
      type: String,
      required: true,
    },

    // =================================================
    // ROLE
    // =================================================

    role: {
      type: String,
      enum: [
        "user",
        "admin",
      ],
      default: "user",
    },

    // =================================================
    // CATEGORY
    // =================================================

    category: {
      type: String,
      enum: [
        "buyer",
        "seller",
        "driver",
      ],
      required: true,
    },

    // =================================================
    // USER TYPE
    // =================================================

    userType: {
      type: String,
      enum: [
        "verified",
        "mediator",
        "dealer",
        "premium",
        "others",
        "partner",
        "black",
      ],
      default: "others",
    },

    // =================================================
    // STATUS
    // =================================================

    status: {
      type: String,
      enum: [
        "not_verified",
        "verified",
      ],
      required: true,
      default: "not_verified",
    },

    // =================================================
    // HIGHLIGHT
    // =================================================

    highlightText: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250,
    },

    // =================================================
    // LOCATION
    // =================================================

    district: {
      type: String,
      required: true,
      trim: true,
    },

  address: {
  type: String,
  default: "NA",
  trim: true,
  maxlength: 500,
},

    // =================================================
    // RE2BUY PROFILE IMAGE
    // =================================================

    profileImage: {
      type: String,
      default: "",
      trim: true,
    },

    // =================================================
    // GALLERY
    // ARRAY - KEEP AS ARRAY
    // =================================================

    galleryImages: {
      type: [String],
      default: [],
    },

    // =================================================
    // PASSWORD REQUEST
    // =================================================

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
  {
    timestamps: true,
  }
);

// =====================================================
// DISTRICT VALIDATION
// =====================================================

userSchema.pre(
  "save",
  function (next) {
    try {
      if (!this.district) {
        return next(
          new Error(
            "District is required"
          )
        );
      }

      const districtKey =
        Object.keys(locations).find(
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

      next();
    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// INDEXES
// =====================================================

userSchema.index({
  district: 1,
});

userSchema.index({
  phone: 1,
});

userSchema.index({
  alternatePhone: 1,
});

userSchema.index({
  status: 1,
});

userSchema.index({
  userType: 1,
});

// =====================================================
// MODEL
// =====================================================

export default mongoose.model(
  "User",
  userSchema
);