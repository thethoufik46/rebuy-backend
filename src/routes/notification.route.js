import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import {
  addNotification,
  getNotifications,
  updateNotification,
  deleteNotification,
} from "../controllers/notification.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   ☁️ CLOUDINARY STORAGE
========================= */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "notifications",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage });

/* =========================
   🟢 CREATE NOTIFICATION
========================= */
router.post(
  "/add",
  verifyToken,
  upload.single("image"), // 🔔 image optional
  addNotification
);

/* =========================
   🔵 GET NOTIFICATIONS
========================= */
router.get(
  "/",
  getNotifications
);

/* =========================
   🟡 UPDATE NOTIFICATION
========================= */
router.put(
  "/:id",
  verifyToken,
  upload.single("image"), // 🔔 image optional
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
