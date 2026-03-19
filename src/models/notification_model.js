import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    link: {
      type: String,
      default: "",
    },

    audioNote: {
      type: String,
      default: "",
    },

    // ✅ NEW FIELD: TYPE (Dropdown)
    type: {
      type: String,
      enum: ["notification", "driver_jobs"], // 🔥 restrict values
      default: "notification",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);