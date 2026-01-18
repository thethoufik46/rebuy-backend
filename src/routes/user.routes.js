import express from "express";
import { verifyToken } from "../middleware/auth.js";
import multer from "multer";
import B2 from "backblaze-b2";
import User from "../models/user_model.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

router.post(
  "/upload-profile",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    try {
      await b2.authorize();

      const bucketId = process.env.B2_BUCKET_ID;

      /* ================= GET OLD IMAGE ================= */
      const existingUser = await User.findById(req.userId);

      let oldFileName = null;
      let oldFileId = null;

      if (
        existingUser?.profileImage &&
        existingUser.profileImage.includes("/file/")
      ) {
        const match =
          existingUser.profileImage.split(
            `/file/${process.env.B2_BUCKET_NAME}/`
          );

        if (match.length === 2) {
          oldFileName = match[1];

          const list = await b2.listFileNames({
            bucketId,
            startFileName: oldFileName,
            maxFileCount: 1,
          });

          if (list.data.files.length > 0) {
            oldFileId = list.data.files[0].fileId;
          }
        }
      }

      /* ================= UPLOAD NEW IMAGE ================= */
      const { data: uploadUrlData } =
        await b2.getUploadUrl({ bucketId });

      const newFileName =
        `profile/${req.userId}-${Date.now()}.png`;

      await b2.uploadFile({
        uploadUrl: uploadUrlData.uploadUrl,
        uploadAuthToken: uploadUrlData.authorizationToken,
        fileName: newFileName,
        data: req.file.buffer,
      });

      const imageUrl =
        `https://f000.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${newFileName}`;

      /* ================= UPDATE DB ================= */
      const user = await User.findByIdAndUpdate(
        req.userId,
        { profileImage: imageUrl },
        { new: true }
      ).select("-password");

      /* ================= DELETE OLD IMAGE ================= */
      if (oldFileId && oldFileName) {
        await b2.deleteFileVersion({
          fileId: oldFileId,
          fileName: oldFileName,
        });
      }

      res.json({
        success: true,
        imageUrl,
        user,
      });
    } catch (err) {
      console.error("❌ Profile upload error:", err);
      res.status(500).json({
        success: false,
        message: "Profile image update failed",
      });
    }
  }
);

export default router;
