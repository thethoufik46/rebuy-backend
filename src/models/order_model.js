import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },
    status: {
      type: String,
      enum: ["booking", "verification", "advance", "delivery", "cancel"],
      default: "booking",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
