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

    email: {
      type: String,
      required: true,
      unique: true,
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
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
