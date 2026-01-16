// ======================= sellproperty.model.js =======================
import mongoose from "mongoose";

const sellPropertySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },

    propertyType: {
      type: String,
      required: true,
      enum: [
        "Residential Building",
        "Commercial Building",
        "Rental Income Building",
        "Commercial Land",
        "Agri Land",
        "Residential Plots",
      ],
    },

    area: { type: String, required: true, trim: true },
    direction: { type: String, trim: true },
    roadAccess: { type: String, trim: true },

    price: { type: Number, required: true, min: 0 },

    sellerType: {
      type: String,
      required: true,
      enum: ["Owner", "Refer", "Agency"],
    },

    description: { type: String, trim: true },

    /* ☁️ CLOUDINARY IMAGE */
    image: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SellProperty", sellPropertySchema);
