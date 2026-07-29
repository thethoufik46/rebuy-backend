// ======================= src/controllers/media.controller.js =======================
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import r2 from "../config/r2.js";
import User from "../models/user_model.js";

const BUCKET = process.env.R2_BUCKET;

/* =====================================================
   UPLOAD PROFILE IMAGE
===================================================== */
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile image required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.profileImage) {
      try {
        await r2.send(
          new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: user.profileImage,
          })
        );
      } catch (_) {}
    }

    const ext = req.file.mimetype.split("/")[1] || "jpg";
    const key = `users/profile/${req.user.id}-${Date.now()}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    user.profileImage = key;
    await user.save();

    res.json({
      success: true,
      message: "Profile image uploaded",
      key,
    });
  } catch (err) {
    console.error("PROFILE UPLOAD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Profile upload failed",
    });
  }
};

/* =====================================================
   UPLOAD MULTIPLE PROOF IMAGES (FIXED)
===================================================== */
export const uploadProofImages = async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({
        success: false,
        message: "Proof images required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Parse documentTypes – support both comma-separated string and array
    let documentTypes = req.body.documentTypes;
    if (typeof documentTypes === "string") {
      documentTypes = documentTypes.split(",").map(s => s.trim());
    }
    if (!Array.isArray(documentTypes) || documentTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "documentTypes required as array or comma-separated string",
      });
    }

    const uploadedProofs = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const ext = file.mimetype.split("/")[1] || "jpg";
      const key = `users/proofs/${req.user.id}-${Date.now()}-${i}.${ext}`;

      await r2.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      uploadedProofs.push({
        documentType: documentTypes[i] || "other",
        image: key,
      });
    }

    user.proofs.push(...uploadedProofs);
    await user.save();

    res.json({
      success: true,
      message: "Proof images uploaded",
      proofs: uploadedProofs,
    });
  } catch (err) {
    console.error("PROOF UPLOAD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Proof upload failed",
    });
  }
};

/* =====================================================
   GENERATE SIGNED URL
===================================================== */
export const getSignedMediaUrl = async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Key is required",
      });
    }

    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
      { expiresIn: 60 }
    );

    res.json({
      success: true,
      url,
    });
  } catch (err) {
    console.error("SIGNED URL ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Signed URL generation failed",
    });
  }
};