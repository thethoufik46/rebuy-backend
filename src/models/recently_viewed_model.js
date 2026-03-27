import mongoose from "mongoose";

const recentlyViewedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    items: [
      {
        type: String, // "car_xxx", "bike_xxx"
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("RecentlyViewed", recentlyViewedSchema);