import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false, // user unread (admin → user)
    },
    adminRead: {
      type: Boolean,
      default: false, // admin unread (user → admin)
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
