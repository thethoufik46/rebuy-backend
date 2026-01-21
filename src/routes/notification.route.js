import express from "express";
import uploadNotification from "../middleware/uploadNotification.js";
import {
  addNotification,
  getNotifications,
  updateNotification,
  deleteNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.post("/add", uploadNotification.single("image"), addNotification);
router.get("/", getNotifications);
router.put("/:id", uploadNotification.single("image"), updateNotification);
router.delete("/:id", deleteNotification);

export default router;
