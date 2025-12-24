import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "itemType", // 🔥 Car | Bike
    },

    itemType: {
      type: String,
      required: true,
      enum: ["Car", "Bike"],
    },
  },
  { timestamps: true }
);

// 🔒 prevent duplicates
wishlistSchema.index(
  { user: 1, itemId: 1, itemType: 1 },
  { unique: true }
);

export default mongoose.model("Wishlist", wishlistSchema);
