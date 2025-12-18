import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    description: String,
    imageUrl: String,
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand", // Link to Brand collection
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
