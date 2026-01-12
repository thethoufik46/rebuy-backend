import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    // 🏷️ TITLE
    title: {
      type: String,
      trim: true,
    },

    // 🖼️ IMAGE (Brand logo madhiri – Cloudinary URL)
    image: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Link", linkSchema);
