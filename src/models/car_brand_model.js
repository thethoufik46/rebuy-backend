// ======================= car_brand_model.js =======================
// C:\flutter_projects\rebuy-backend\src\models\car_brand_model.js

import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    logoUrl: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Brand", brandSchema);
