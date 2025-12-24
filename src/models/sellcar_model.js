import mongoose from "mongoose";

const sellCarSchema = new mongoose.Schema(
  {
    /* =========================
       🔐 LOGIN USER
    ========================= */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* =========================
       📞 CONTACT INFO
    ========================= */
    name: {
      type: String,
      required: true,
      trim: true,
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

    /* =========================
       🚗 VEHICLE INFO
    ========================= */
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

    /* =========================
       🖼️ CAR IMAGES
    ========================= */
    carImages: [
      {
        type: String,
        required: true,
      },
    ],

    /* =========================
       🛠️ ADMIN FLOW
    ========================= */
    status: {
      type: String,
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SellCar", sellCarSchema);
