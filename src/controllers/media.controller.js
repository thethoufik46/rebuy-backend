// ======================= src/controllers/media.controller.js =======================

import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import r2 from "../config/r2.js";
import User from "../models/user_model.js";

/* ===============================
   UPLOAD PROFILE IMAGE
================================ */
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image required",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // delete old image
    if (user.profileImage) {
      await r2.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: user.profileImage,
        })
      );
    }

    const key = `profile/${req.userId}-${Date.now()}.jpg`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    user.profileImage = key;
    await user.save();

    res.json({
      success: true,
      key,
    });
  } catch (err) {
    console.error("R2 upload error:", err);
    res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
};

/* ===============================
   GET SIGNED IMAGE URL
================================ */
export const getSignedMediaUrl = async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Key required",
      });
    }

    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
      }),
      { expiresIn: 60 }
    );

    res.json({
      success: true,
      url,
    });
  } catch (err) {
    console.error("Signed URL error:", err);
    res.status(500).json({
      success: false,
      message: "Failed",
    });
  }
};
