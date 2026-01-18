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


// ================= USER SEND REPORT =================
router.post(
  "/",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    try {
      let imageUrl = "";

      if (req.file) {
        await b2.authorize();

        const { data } = await b2.getUploadUrl({
          bucketId: process.env.B2_BUCKET_ID,
        });

        const fileName =
          `reports/${req.userId}-${Date.now()}.jpg`;

        await b2.uploadFile({
          uploadUrl: data.uploadUrl,
          uploadAuthToken: data.authorizationToken,
          fileName,
          data: req.file.buffer,
        });

        imageUrl =
          `https://f003.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${fileName}`;
      }

      const report = await Report.create({
        user: req.userId,
        message: req.body.message,
        image: imageUrl,
      });

      res.json({
        success: true,
        report,
      });
    } catch (e) {
      res.status(500).json({
        success: false,
        message: "Report failed",
      });
    }
  }
);


// ================= USER VIEW MY REPORTS =================
router.get("/my", verifyToken, async (req, res) => {
  const reports = await Report.find({ user: req.userId })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    reports,
  });
});


// ================= ADMIN VIEW ALL =================
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


// ================= ADMIN UPDATE STATUS =================
router.put(
  "/admin/:id/status",
  verifyToken,
  async (req, res) => {
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
  }
);


// ================= ADMIN DELETE =================
router.delete(
  "/admin/:id",
  verifyToken,
  async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    await Report.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
    });
  }
);

export default router;
