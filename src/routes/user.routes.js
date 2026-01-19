import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.js";
import {
  uploadProfileImage,
  getSignedMediaUrl,
} from "../controllers/media.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 🔐 login user only
router.post(
  "/upload-profile",
  verifyToken,
  upload.single("image"),
  uploadProfileImage
);

// 🔐 private image view
router.get(
  "/media-url",
  verifyToken,
  getSignedMediaUrl
);

export default router;
