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
      type: String,
      default: "",
    },

    link: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
