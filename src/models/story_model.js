import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    media: String,
    mediaType: {
      type: String,
      enum: ["image", "video"],
    },
    expiresAt: Date,
  },
  { timestamps: true }
);

// 🔥 Auto delete after 24h
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Story", storySchema);
