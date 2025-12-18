import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    logoUrl: {
      type: String, // Cloudinary URL
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Brand", brandSchema);
