import mongoose from "mongoose";

const bikeOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bike: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bike",
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

export default mongoose.model("BikeOrder", bikeOrderSchema);
