// models/user_model.js

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // ❌ EMAIL NOT REQUIRED
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // ✅ allows multiple users without email
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

    location: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    // 🔑 FORGOT PASSWORD SUPPORT
    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpire: {
      type: Date,
    },

    // 🔔 NOTIFICATION TRACKING
    lastNotificationSeenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
