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

    // 🔥 user side-la kaatanuma illaya
    isUserVisible: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🔒 ONE USER → ONE CAR → ONE ORDER ONLY
carOrderSchema.index({ user: 1, car: 1 }, { unique: true });

export default mongoose.model("CarOrder", carOrderSchema);
