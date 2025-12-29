import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  sendUserMessage,
  sendAdminReply,
  getUserChat,
  getAllChats,
  markChatAsRead,
  getUnreadCount,
} from "../controllers/chat.controller.js";

const router = express.Router();

/* USER */
router.post("/user/send", verifyToken, sendUserMessage);
router.get("/user/me", verifyToken, getUserChat);
router.post("/user/read", verifyToken, markChatAsRead);
router.get("/user/unread-count", verifyToken, getUnreadCount);

/* ADMIN */
router.post("/admin/reply", verifyToken, sendAdminReply);
router.get("/admin/chats", verifyToken, getAllChats);

export default router;
