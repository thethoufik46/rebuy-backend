// ======================= src/routes/user.routes.js =======================

import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.js";
import {
  uploadProfileImage,
  getSignedMediaUrl,
} from "../controllers/media.controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post(
  "/upload-profile",
  verifyToken,
  upload.single("image"),
  uploadProfileImage
);

router.get("/media-url", verifyToken, getSignedMediaUrl);

export default router;
