import express from "express";
import multer from "multer";
import B2 from "backblaze-b2";

import Report from "../models/report_model.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ======================================================
   BACKBLAZE INIT
====================================================== */
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

/* ======================================================
   USER → SEND REPORT (UPLOAD IMAGE)
====================================================== */
router.post(
  "/",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    try {
      let fileName = "";

      if (req.file) {
        await b2.authorize();

        const { data } = await b2.getUploadUrl({
          bucketId: process.env.B2_BUCKET_ID,
        });

        fileName = `reports/${req.userId}-${Date.now()}.jpg`;

        await b2.uploadFile({
          uploadUrl: data.uploadUrl,
          uploadAuthToken: data.authorizationToken,
          fileName,
          data: req.file.buffer,
          contentType: req.file.mimetype,
        });
      }

      const report = await Report.create({
        user: req.userId,
        message: req.body.message,
        fileName, // ✅ ONLY STORE FILENAME
      });

      res.json({
        success: true,
        report,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Report upload failed",
      });
    }
  }
);

/* ======================================================
   USER → MY REPORTS
====================================================== */
router.get("/my", verifyToken, async (req, res) => {
  const reports = await Report.find({ user: req.userId }).sort({
    createdAt: -1,
  });

  res.json({
    success: true,
    reports,
  });
});

/* ======================================================
   ADMIN → VIEW ALL REPORTS
====================================================== */
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

/* ======================================================
   🔐 SIGNED IMAGE URL (PRIVATE VIEW)
====================================================== */
router.get("/image/:fileName", verifyToken, async (req, res) => {
  try {
    const fileName = req.params.fileName;

    if (!fileName) {
      return res.status(400).json({ message: "File name missing" });
    }

    await b2.authorize();

    const { data } = await b2.getDownloadAuthorization({
      bucketId: process.env.B2_BUCKET_ID,
      fileNamePrefix: fileName,
      validDurationInSeconds: 300, // 5 minutes
    });

    const signedUrl =
      `${process.env.B2_DOWNLOAD_URL}/file/` +
      `${process.env.B2_BUCKET_NAME}/` +
      `${fileName}?Authorization=${data.authorizationToken}`;

    res.json({
      success: true,
      url: signedUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Signed URL generation failed",
    });
  }
});

/* ======================================================
   ADMIN → DELETE REPORT (DB + B2)
====================================================== */
router.delete("/admin/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.fileName) {
      await b2.authorize();

      const list = await b2.listFileNames({
        bucketId: process.env.B2_BUCKET_ID,
        startFileName: report.fileName,
        maxFileCount: 1,
      });

      const file = list.data.files[0];

      if (file) {
        await b2.deleteFileVersion({
          fileId: file.fileId,
          fileName: file.fileName,
        });
      }
    }

    await report.deleteOne();

    res.json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});

export default router;
