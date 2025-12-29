import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  sendUserMessage,
  sendAdminReply,
  getUserChat,
  getAllChats,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/user/send", verifyToken, sendUserMessage);
router.get("/user/me", verifyToken, getUserChat);

router.post("/admin/reply", verifyToken, sendAdminReply);
router.get("/admin/chats", verifyToken, getAllChats);

export default router;
