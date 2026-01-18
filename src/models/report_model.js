import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    // 🔗 USER DETAILS
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 📝 MESSAGE
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // 🖼 IMAGE PUBLIC URL (for view)
    image: {
      type: String,
      default: "",
    },

    // 🗂 B2 FILE NAME (for delete)
    fileName: {
      type: String,
      default: "",
    },

    // 📌 STATUS FLOW
    status: {
      type: String,
      enum: ["SENT", "PENDING", "SUCCESS"],
      default: "SENT",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Report", reportSchema);
