// ======================= slider_model.js =======================

import mongoose from "mongoose";

const sliderSchema = new mongoose.Schema(
  {
    // ============================================================
    // CATEGORY
    // ============================================================

    category: {
      type: String,
      // ✅ enum நீக்கப்பட்டுவிட்டது. நீங்கள் எந்தப் பெயரை வேண்டுமானாலும் டைப் செய்யலாம்
      required: true,
      lowercase: true,
      trim: true,
    },

    // ============================================================
    // SLIDER IMAGE
    // ============================================================

    imageUrl: {
      type: String,
      required: true,
    },

    // ============================================================
    // SLIDER ORDER
    // 1 TO 100
    // ============================================================

    order: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// SAME CATEGORY + SAME ORDER NOT ALLOWED
// ============================================================

sliderSchema.index(
  {
    category: 1,
    order: 1,
  },
  {
    unique: true,
  }
);

// ============================================================
// MONGODB COLLECTION = sliders
// ============================================================

const Slider = mongoose.model(
  "Slider",
  sliderSchema,
  "sliders"
);

export default Slider;