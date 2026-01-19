import express from "express";
import multer from "multer";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import r2 from "../config/r2.js";
import Report from "../models/report_model.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ======================================================
   USER → SEND REPORT
====================================================== */
router.post("/", verifyToken, upload.single("image"), async (req, res) => {
  try {
    let imageUrl = "";

    if (req.file) {
      const fileName = `reports/${req.userId}-${Date.now()}.jpg`;

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );

      // 🔥 R2 PUBLIC URL
      imageUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    }

    const report = await Report.create({
      user: req.userId,
      message: req.body.message || "",
      image: imageUrl,
      status: "PENDING",
    });

    res.json({
      success: true,
      report,
    });
  } catch (err) {
    console.error("❌ REPORT UPLOAD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Report upload failed",
    });
  }
});

/* ======================================================
   USER → MY REPORTS
====================================================== */
router.get("/my", verifyToken, async (req, res) => {
  const reports = await Report.find({ user: req.userId }).sort({
    createdAt: -1,
  });

  res.json({ success: true, reports });
});

/* ======================================================
   ADMIN → ALL REPORTS
====================================================== */
router.get("/admin/all", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const reports = await Report.find()
    .populate("user", "name phone")
    .sort({ createdAt: -1 });

  res.json({ success: true, reports });
});

/* ======================================================
   ADMIN → UPDATE STATUS
====================================================== */
router.put("/admin/:id/status", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  res.json({ success: true, report });
});

/* ======================================================
   ADMIN → DELETE REPORT (R2 + DB)
====================================================== */
router.delete("/admin/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Not found" });
    }

    // 🔥 DELETE IMAGE FROM R2
    if (report.image) {
      const fileKey = report.image.replace(
        `${process.env.R2_PUBLIC_URL}/`,
        ""
      );

      await r2.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: fileKey,
        })
      );
    }

    await report.deleteOne();

    res.json({
      success: true,
      message: "Report deleted",
    });
  } catch (err) {
    console.error("❌ DELETE REPORT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});

export default router;
