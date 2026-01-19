// ======================= src/routes/user.routes.js =======================

import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.js";
import { uploadProfileImage } from "../controllers/media.controller.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import r2 from "../config/r2.js";

const router = express.Router();

/* ================= MULTER ================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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
   IMAGE VIEW (WEB + ANDROID SAFE)
================================================== */
router.get("/image/*", verifyToken, async (req, res) => {
  try {
    const key = req.params[0]; // 🔥 important

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    const data = await r2.send(command);

    res.setHeader("Content-Type", "image/png");
    data.Body.pipe(res);
  } catch (err) {
    res.status(404).end();
  }
});


export default router;
