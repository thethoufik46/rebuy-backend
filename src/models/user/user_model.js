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
const locations = JSON.parse(fs.readFileSync(locationsPath, "utf-8"));

// =====================================================
// SESSION SUB-SCHEMA (Hashed refresh tokens)
// =====================================================
const sessionSchema = new mongoose.Schema(
  {
    // ✅ Hashed token (never store raw)
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    device: {
      type: String,
      default: "Unknown Device",
      trim: true,
      maxlength: 200,
    },
    ip: {
      type: String,
      default: "",
      trim: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    // ✅ Reuse detection — rotated tokens
    replacedBy: {
      type: String,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedReason: {
      type: String,
      default: "",
    },
  },
  { _id: true, timestamps: true }
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
    // GOOGLE ACCOUNT
    // =================================================
    googleName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    googleProfileImage: { type: String, required: true, trim: true },

    // =================================================
    // PHONE
    // =================================================
    phone: {
      type: String,
      required: true,
      trim: true,
      set: (v) => v?.toString().replace(/\s+/g, ""),
    },
    alternatePhone: {
      type: String,
      default: "",
      trim: true,
      set: (v) => v?.toString().replace(/\s+/g, ""),
    },

    // =================================================
    // PASSWORD
    // =================================================
    password: { type: String, required: true },

    // =================================================
    // ROLE
    // =================================================
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // =================================================
    // CATEGORY
    // =================================================
    category: {
      type: String,
      enum: ["buyer", "seller", "driver"],
      required: true,
    },

    // =================================================
    // USER TYPE
    // =================================================
    userType: {
      type: String,
      enum: [
        "verified", "mediator", "dealer", "premium",
        "others", "partner", "black",
      ],
      default: "others",
    },

    // =================================================
    // STATUS
    // =================================================
    status: {
      type: String,
      enum: ["not_verified", "verified"],
      required: true,
      default: "not_verified",
    },

    // =================================================
    // LANGUAGE
    // =================================================
    language: {
      type: String,
      enum: ["en","ta","ml","te","hi","kn","bn","mr","gu","ur","or"],
      default: "en",
      required: false,
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
    district: { type: String, required: true, trim: true },
    address: {
      type: String,
      default: "NA",
      trim: true,
      maxlength: 500,
    },

    // =================================================
    // PROFILE IMAGE
    // =================================================
    profileImage: { type: String, default: "", trim: true },

    // =================================================
    // GALLERY
    // =================================================
    galleryImages: { type: [String], default: [] },

    // =================================================
    // PASSWORD RESET OTP
    // =================================================
    resetOtp: { type: String, default: null },
    resetOtpExpiry: { type: Date, default: null },
    resetOtpAttempts: { type: Number, default: 0 },

    // =================================================
    // LOGIN ATTEMPTS (Brute Force)
    // =================================================
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    // =================================================
    // ✅ SESSIONS — Hashed refresh tokens + devices
    // Max 5 active sessions per user
    // =================================================
    sessions: {
      type: [sessionSchema],
      default: [],
    },

    // =================================================
    // ✅ SECURITY — Track token reuse attacks
    // =================================================
    lastSecurityEvent: {
      type: String,
      default: "",
    },
    lastSecurityEventAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// =====================================================
// DISTRICT VALIDATION
// =====================================================
userSchema.pre("save", function (next) {
  try {
    if (!this.district) {
      return next(new Error("District is required"));
    }
    const districtKey = Object.keys(locations).find(
      (d) => d.toLowerCase() === this.district.toLowerCase()
    );
    if (!districtKey) throw new Error("Invalid district");
    this.district = districtKey;
    next();
  } catch (error) {
    next(error);
  }
});

// =====================================================
// INDEXES
// =====================================================
userSchema.index({ district: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ alternatePhone: 1 });
userSchema.index({ status: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ language: 1 });

// ✅ Session lookup — fast
userSchema.index({ "sessions.tokenHash": 1 });
userSchema.index({ "sessions.expiresAt": 1 });

// =====================================================
// METHODS
// =====================================================

// Cleanup expired sessions
userSchema.methods.cleanupSessions = function () {
  const now = new Date();
  this.sessions = this.sessions.filter((s) => s.expiresAt > now);
};

// Get active sessions count
userSchema.methods.getActiveSessions = function () {
  const now = new Date();
  return this.sessions.filter((s) => s.expiresAt > now && !s.revokedAt);
};

// =====================================================
// MODEL
// =====================================================
export default mongoose.model("User", userSchema);