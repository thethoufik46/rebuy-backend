import mongoose from "mongoose";

const carOrderSchema = new mongoose.Schema(
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
      enum: [
        "booking",
        "verification",
        "advance",
        "delivery",
        "cancel_requested",
        "cancelled",
      ],
      default: "booking",
    },

    // 🔥 IMPORTANT
    isUserVisible: {
      type: Boolean,
      default: true, // user-ku kaanum
    },
  },
  { timestamps: true }
);

// 🔒 ONE USER → ONE CAR → ONE ORDER
carOrderSchema.index({ user: 1, car: 1 }, { unique: true });

export default mongoose.model("Order", carOrderSchema);
