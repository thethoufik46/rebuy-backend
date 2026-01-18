import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { uploadSingle } from "../middleware/upload.js";
import User from "../models/user_model.js";

const router = express.Router();

/* ================= UPLOAD PROFILE IMAGE ================= */
router.post(
  "/upload-profile",
  verifyToken,
  uploadSingle,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Image not received",
        });
      }

      // Backblaze / local filename
      const imageName = req.file.filename || req.file.originalname;

      const user = await User.findByIdAndUpdate(
        req.userId,
        { profileImage: imageName },
        { new: true }
      ).select("-password");

      res.json({
        success: true,
        profileImage: user.profileImage,
        user,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Profile upload failed",
      });
    }
  }
);

export default router;
