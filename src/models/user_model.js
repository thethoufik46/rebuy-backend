import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    /// ✅ MULTIPLE PHONE NUMBERS 🔥🔥🔥
    phones: [
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

    password: { type: String, required: true },

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

    location: { type: String, default: "NA" },
    address: { type: String, default: "NA" },

    profileImage: { type: String, default: "" },

    forgotRequest: { type: Boolean, default: false },
    forgotRequestAt: { type: Date, default: null },

    requestedPassword: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
