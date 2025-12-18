import mongoose from "mongoose";

const searchSchema = new mongoose.Schema(
  {
    // 🔎 Search text typed by user
    keyword: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // 👤 Optional: user who searched
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // 🌍 Optional metadata
    ipAddress: {
      type: String,
    },

    device: {
      type: String, // mobile / web
    },

    // 📊 Count how many times searched
    count: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

/* =================================================
   ⚡ INDEXES FOR FAST SEARCH
==================================================*/

// Auto-suggest & trending
searchSchema.index({ keyword: 1 });

// Recent searches
searchSchema.index({ createdAt: -1 });

const Search = mongoose.model("Search", searchSchema);

export default Search;
