import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    image: {
      type: String, // public url
      default: "",
    },

    fileId: {
      type: String, // backblaze fileId
      default: "",
    },

    status: {
      type: String,
      enum: ["SENT", "PENDING", "SUCCESS"],
      default: "SENT",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
