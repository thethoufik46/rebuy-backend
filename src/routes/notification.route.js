// ======================= notification.routes.js =======================

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

/* =========================
   🟢 CREATE NOTIFICATION
========================= */
router.post(
  "/add",
  verifyToken,
  uploadNotification.single("image"),
  addNotification
);

/* =========================
   🔵 GET NOTIFICATIONS
========================= */
router.get("/", verifyToken, getNotifications);

/* =========================
   🔴 UNREAD COUNT (BADGE)
========================= */
router.get(
  "/unread-count",
  verifyToken,
  getUnreadNotificationCount
);

/* =========================
   ✅ MARK AS SEEN
========================= */
router.post(
  "/mark-seen",
  verifyToken,
  markNotificationsAsSeen
);

/* =========================
   🟡 UPDATE NOTIFICATION
========================= */
router.put(
  "/:id",
  verifyToken,
  uploadNotification.single("image"),
  updateNotification
);

/* =========================
   🔴 DELETE NOTIFICATION
========================= */
router.delete(
  "/:id",
  verifyToken,
  deleteNotification
);

export default router;
