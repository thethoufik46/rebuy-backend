import express from "express";
import uploadNotification from "../middleware/uploadNotification.js";
import { verifyToken } from "../middleware/auth.js";
import {
  addNotification,
  getNotifications,
  updateNotification,
  deleteNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.post(
  "/add",
  uploadNotification.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  addNotification
);

router.get("/", getNotifications);

// ✅ NEW — unread count
router.get("/unread-count", verifyToken, async (req, res) => {
  try {
    const Notification = (await import("../models/notification.model.js")).default;
    const count = await Notification.countDocuments({
      userId: req.userId,
      read: false
    });
    res.json({ success: true, count });
  } catch (error) {
    console.error("UNREAD COUNT ERROR:", error);
    res.status(500).json({ success: false, count: 0 });
  }
});

router.put(
  "/:id",
  uploadNotification.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  updateNotification
);

router.delete("/:id", deleteNotification);

export default router;