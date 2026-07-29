// ======================= src/routes/user.routes.js =======================
import express from "express";
import multer from "multer";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { verifyToken } from "../middleware/auth.js";
import {
  uploadProfileImage,
  uploadProofImages,
  getSignedMediaUrl,
} from "../controllers/media.controller.js";
import r2 from "../config/r2.js";

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

router.post(
  "/upload-proof",
  verifyToken,
  upload.array("images", 10),
  uploadProofImages
);

router.get(
  "/signed-url",
  verifyToken,
  getSignedMediaUrl
);

router.get("/image/*", async (req, res) => {
  try {
    const key = req.params[0];
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });
    const data = await r2.send(command);
    res.setHeader("Content-Type", data.ContentType || "application/octet-stream");
    if (data.Body) {
      data.Body.pipe(res);
    } else {
      return res.status(404).json({ success: false, message: "Image not found" });
    }
  } catch (err) {
    console.error("Image fetch error:", err);
    return res.status(404).json({ success: false, message: "Image not found" });
  }
});

export default router;