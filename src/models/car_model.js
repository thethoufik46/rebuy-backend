import mongoose from "mongoose";

const carSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand", // Link to brand collection
      required: true,
    },
    model: { type: String, required: true },
    year: { type: String, required: true },
    price: { type: Number, required: true },
    km: { type: Number, required: true },
    color: { type: String, required: true },
    fuel: {
      type: String,
      enum: ["petrol", "diesel", "cng", "lpg", "electric"],
      required: true,
    },
    transmission: {
      type: String,
      enum: ["manual", "automatic"],
      required: true,
    },
    owner: { type: String, required: true },
    board: {
      type: String,
      enum: ["own", "t board"],
      required: true,
    },
    description: { type: String },
    insurance: {
      type: String,
      enum: ["comprehensive", "thirdparty", "no insurance"],
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "booking", "sold"],
      default: "available",
    },
    bannerImage: { type: String, required: true }, // single banner
    galleryImages: [{ type: String }], // multiple images
  },
  { timestamps: true }
);

export default mongoose.model("Car", carSchema);
