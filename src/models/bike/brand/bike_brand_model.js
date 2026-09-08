// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import mongoose from "mongoose";
const bikeBrandSchema = new mongoose.Schema(
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
  {
    timestamps: true,
  }
);
const BikeBrand = mongoose.model(
  "BikeBrand",
  bikeBrandSchema,
  "bikebrands"
);
export default BikeBrand;