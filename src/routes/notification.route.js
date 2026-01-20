import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadNotification from "../middleware/uploadNotification.js";

import {
  addNotification,
  getNotifications,
  updateNotification,
  deleteNotification,
  getUnreadNotificationCount,
  markNotificationsAsSeen,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.post(
  "/add",
  verifyToken,
  uploadNotification.single("image"), // 🔥 THIS IS MUST
  addNotification
);

router.get("/", verifyToken, getNotifications);

router.get("/unread-count", verifyToken, getUnreadNotificationCount);

router.post("/mark-seen", verifyToken, markNotificationsAsSeen);

router.put(
  "/:id",
  verifyToken,
  uploadNotification.single("image"),
  updateNotification
);

router.delete("/:id", verifyToken, deleteNotification);

export default router;
