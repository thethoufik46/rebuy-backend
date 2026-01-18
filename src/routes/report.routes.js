// ======================= routes/report.routes.js =======================

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


// ======================================================================
// USER → SEND REPORT
// ======================================================================
router.post(
  "/",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    try {
      let imageUrl = "";
      let b2FileId = "";

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
        });

        imageUrl =
          `https://f003.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${fileName}`;

        b2FileId = uploadRes.data.fileId;
      }

      const report = await Report.create({
        user: req.userId,
        message: req.body.message,
        image: imageUrl,
        b2FileId,
      });

      res.json({
        success: true,
        report,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({
        success: false,
        message: "Report failed",
      });
    }
  }
);


// ======================================================================
// USER → VIEW MY REPORTS
// ======================================================================
router.get("/my", verifyToken, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      reports,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
    });
  }
});


// ======================================================================
// ADMIN → VIEW ALL REPORTS
// ======================================================================
router.get("/admin/all", verifyToken, async (req, res) => {
  try {
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
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin reports",
    });
  }
});


// ======================================================================
// ADMIN → UPDATE STATUS
// ======================================================================
router.put(
  "/admin/:id/status",
  verifyToken,
  async (req, res) => {
    try {
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
    } catch (e) {
      res.status(500).json({
        success: false,
        message: "Status update failed",
      });
    }
  }
);


// ======================================================================
// ADMIN → DELETE REPORT + BACKBLAZE IMAGE
// ======================================================================
router.delete(
  "/admin/:id",
  verifyToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin only" });
      }

      const report = await Report.findById(req.params.id);

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // 🔥 DELETE IMAGE FROM BACKBLAZE
      if (report.b2FileId && report.image) {
        await b2.authorize();

        const fileName = report.image.split("/file/")[1];

        await b2.deleteFileVersion({
          fileId: report.b2FileId,
          fileName,
        });
      }

      await Report.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Report & image deleted successfully",
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({
        success: false,
        message: "Delete failed",
      });
    }
  }
);

export default router;
