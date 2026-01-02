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
    imageUrl: {
      type: String, // optional
      default: null,
    },
    link: {
      type: String, // optional
      default: null,
    },
    lastNotificationSeenAt: {
  type: Date,
  default: null,
},
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
