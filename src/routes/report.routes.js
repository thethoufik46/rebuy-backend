// ================= REPORT ROUTES (FINAL FULL CODE) =================

import express from "express";
import multer from "multer";
import B2 from "backblaze-b2";

import Report from "../models/report_model.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

// ===================================================================
// USER → SEND REPORT (IMAGE → B2, DATA → DB)
// ===================================================================
router.post(
  "/",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    try {
      let imageUrl = "";
      let fileId = "";

      if (req.file) {
        await b2.authorize();

        const { data } = await b2.getUploadUrl({
          bucketId: process.env.B2_BUCKET_ID,
        });

        const fileName = `reports/${req.userId}-${Date.now()}.jpg`;

        const uploadRes = await b2.uploadFile({
          uploadUrl: data.uploadUrl,
          uploadAuthToken: data.authorizationToken,
          fileName,
          data: req.file.buffer,
          contentType: "image/jpeg",
        });

        imageUrl = `https://f003.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${fileName}`;
        fileId = uploadRes.data.fileId;
      }

      const report = await Report.create({
        user: req.userId,
        message: req.body.message,
        image: imageUrl,
        fileId: fileId,
      });

      res.json({
        success: true,
        report,
      });
    } catch (err) {
      console.error("❌ Report upload error:", err);
      res.status(500).json({
        success: false,
        message: "Report upload failed",
      });
    }
  }
);

// ===================================================================
// USER → VIEW MY REPORTS
// ===================================================================
router.get("/my", verifyToken, async (req, res) => {
  const reports = await Report.find({ user: req.userId }).sort({
    createdAt: -1,
  });

  res.json({
    success: true,
    reports,
  });
});

// ===================================================================
// ADMIN → VIEW ALL REPORTS
// ===================================================================
router.get("/admin/all", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const reports = await Report.find()
    .populate("user", "name phone")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    reports,
  });
});

// ===================================================================
// ADMIN → UPDATE STATUS
// ===================================================================
router.put("/admin/:id/status", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  res.json({
    success: true,
    report,
  });
});

// ===================================================================
// ADMIN → DELETE REPORT (DB + BACKBLAZE)
// ===================================================================
router.delete("/admin/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // ✅ delete image from Backblaze
    if (report.fileId) {
      await b2.authorize();

      await b2.deleteFileVersion({
        fileId: report.fileId,
        fileName: report.image.split("/file/")[1],
      });
    }

    // ✅ delete from MongoDB
    await Report.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Report & image deleted successfully",
    });
  } catch (err) {
    console.error("❌ Delete report error:", err);
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});

export default router;
