// ================= wishlist.model.js (FINAL WITH ELECTRONICS ADDED) =================

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
      refPath: "itemType",
    },

    itemType: {
      type: String,
      enum: ["Car", "Bike", "Property", "Electronics"], // ✅ ADDED ELECTRONICS
      required: true,
    },
  },
  { timestamps: true }
);

/// ✅ UNIQUE (ONE ITEM ONLY PER USER)
wishlistSchema.index(
  { user: 1, itemId: 1, itemType: 1 },
  { unique: true }
);

export default mongoose.model("Wishlist", wishlistSchema);