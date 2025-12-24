import mongoose from "mongoose";

const sellCarSchema = new mongoose.Schema(
  {
    // Contact Info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },

    // Vehicle Info
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    variant: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    fuelType: {
      type: String,
      required: true,
    },
    transmission: {
      type: String,
      required: true,
    },
    kmsDriven: {
      type: Number,
      required: true,
    },
    seater: {
      type: Number,
      required: true,
    },
    insuranceIdv: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },

    // Admin flow
    status: {
      type: String,
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SellCar", sellCarSchema);
