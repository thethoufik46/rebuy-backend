// ======================= src/models/reels/reels_model.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.

import mongoose from "mongoose";
import Counter from "../counter_model.js";

const reelSchema = new mongoose.Schema(
  {
    reelId: { type: Number, unique: true, index: true },
    reelUuid: { type: String, required: true, unique: true, index: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sellerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: ["cars", "bikes", "property", "electronics"],
      required: true,
      index: true,
    },
    listingId: { type: Number, required: true, index: true },
    rawKey: { type: String, default: null },
    videoKey1080: { type: String, default: null },
    videoKey720: { type: String, default: null },
    thumbnailKey: { type: String, default: null },
    videoUrl1080: { type: String, default: null },
    videoUrl720: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    duration: { type: Number, default: null },
    sizeBytes: { type: Number, default: null },
    status: {
      type: String,
      enum: ["processing", "ready", "failed", "rejected"],
      default: "processing",
      index: true,
    },
    failReason: { type: String, default: null },
    shares: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

reelSchema.index({ category: 1, status: 1, createdAt: -1, _id: -1 });
reelSchema.index({ category: 1, listingId: 1 });
reelSchema.index({ createdBy: 1, createdAt: -1 });
reelSchema.index({ sellerUser: 1, createdAt: -1 });

reelSchema.pre("save", async function (next) {
  try {
    if (!this.reelId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "reelId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.reelId = counter.seq;
    }
    if (this.listingId === null || this.listingId === undefined) {
      throw new Error("listingId is required");
    }
    this.listingId = Number(this.listingId);
    if (!Number.isInteger(this.listingId) || this.listingId <= 0) {
      throw new Error("listingId must be a positive integer");
    }
    if (this.duration !== null && this.duration !== undefined) {
      this.duration = Number(this.duration);
      if (!Number.isFinite(this.duration) || this.duration <= 0) {
        throw new Error("Duration must be a positive number");
      }
    }
    if (this.sizeBytes !== null && this.sizeBytes !== undefined) {
      this.sizeBytes = Number(this.sizeBytes);
      if (!Number.isFinite(this.sizeBytes) || this.sizeBytes < 0) {
        throw new Error("sizeBytes must be a valid number");
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

const Reel = mongoose.model("Reel", reelSchema, "reels");
export default Reel;