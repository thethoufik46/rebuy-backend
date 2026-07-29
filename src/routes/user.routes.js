// ======================= src/routes/user.routes.js =======================

import express from "express";
import multer from "multer";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import { verifyToken } from "../middleware/auth.js";
import {
  uploadProfileImage,
  uploadProofImages,
} from "../controllers/media.controller.js";

import r2 from "../config/r2.js";

const router = express.Router();

/* ==================================================
   MULTER
================================================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per image
  },
});

/* ==================================================
   UPLOAD PROFILE IMAGE
================================================== */
router.post(
  "/upload-profile",
  verifyToken,
  upload.single("image"),
  uploadProfileImage
);

/* ==================================================
   UPLOAD MULTIPLE PROOF IMAGES
================================================== */
router.post(
  "/upload-proof",
  verifyToken,
  upload.array("images", 10), // Maximum 10 proof images
  uploadProofImages
);

/* ==================================================
   VIEW IMAGE (PROFILE / PROOF)
================================================== */
// No authentication required
router.get("/image/*", async (req, res) => {
  try {
    const key = req.params[0];

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    const data = await r2.send(command);

    res.setHeader(
      "Content-Type",
      data.ContentType || "application/octet-stream"
    );

    if (data.Body) {
      data.Body.pipe(res);
    } else {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }
  } catch (err) {
    console.error("Image fetch error:", err);

    return res.status(404).json({
      success: false,
      message: "Image not found",
    });
  }
});

export default router;