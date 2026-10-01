import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    link: { type: String, default: "" },
    audioNote: { type: String, default: "" },
    type: {
      type: String,
      enum: ["notification", "driver_jobs"],
      default: "notification",
      required: true,
    },
    // ✅ NEW
    read: { type: Boolean, default: false },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);