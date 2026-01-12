import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },

    link: {
      type: String,
      trim: true,
    },

    // 🖼️ IMAGE (LIKE BRAND LOGO)
    image: {
      type: String, // Cloudinary URL
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Link", linkSchema);
