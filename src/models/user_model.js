import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    password: { type: String, required: true },

    // 🔐 ACCESS CONTROL
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // 👥 BUSINESS LOGIC
    category: {
      type: String,
      enum: ["buyer", "seller", "driver"],
      required: true,
    },

    location: { type: String, default: "NA" },
    address: { type: String, default: "NA" },

    profileImage: { type: String, default: "" },

    resetPasswordToken: String,
    resetPasswordExpire: Date,

    lastNotificationSeenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
