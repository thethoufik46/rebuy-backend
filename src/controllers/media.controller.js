// src/controllers/media.controller.js

import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import r2 from "../config/r2.js";
import User from "../models/user_model.js";

const BUCKET = process.env.R2_BUCKET;

/**
 * Helper to determine the target user ID for image uploads.
 * If the request contains targetUserId (admin only), use that.
 * Otherwise, fallback to the authenticated user's ID.
 * Throws an error if the user is not authorized.
 */
const getTargetUserId = async (req) => {
  const targetUserId = req.body.targetUserId || req.query.targetUserId;

  // If no target provided, use the logged-in user
  if (!targetUserId) {
    return req.user.id;
  }

  // If target is different from the authenticated user, verify admin status
  if (targetUserId !== req.user.id) {
    if (req.user.role !== "admin") {
      throw new Error("Not authorized to upload for other users");
    }
    // Optional: verify that the target user actually exists
    const targetUser = await User.findById(targetUserId).select("_id");
    if (!targetUser) {
      throw new Error("Target user not found");
    }
  }

  return targetUserId;
};

/* ================= UPLOAD PROFILE IMAGE ================= */
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile image required",
      });
    }

    // Determine who we are uploading for
    let targetUserId;
    try {
      targetUserId = await getTargetUserId(req);
    } catch (permErr) {
      return res.status(403).json({
        success: false,
        message: permErr.message,
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete old profile image if exists
    if (user.profileImage) {
      try {
        await r2.send(
          new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: user.profileImage,
          })
        );
      } catch (_) {
        // Ignore deletion errors (file may not exist)
      }
    }

    const ext = req.file.mimetype.split("/")[1] || "jpg";
    const key = `users/profile/${targetUserId}-${Date.now()}.${ext}`;

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

/* ================= UPLOAD PROOF IMAGES ================= */
export const uploadProofImages = async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({
        success: false,
        message: "Proof images required",
      });
    }

    // Determine who we are uploading for
    let targetUserId;
    try {
      targetUserId = await getTargetUserId(req);
    } catch (permErr) {
      return res.status(403).json({
        success: false,
        message: permErr.message,
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Parse document types (can be comma-separated string or array)
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

    // Ensure we have exactly the same number of document types as files
    if (documentTypes.length !== req.files.length) {
      return res.status(400).json({
        success: false,
        message: `Number of document types (${documentTypes.length}) does not match number of files (${req.files.length})`,
      });
    }

    const uploadedProofs = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const ext = file.mimetype.split("/")[1] || "jpg";
      const key = `users/proofs/${targetUserId}-${Date.now()}-${i}.${ext}`;

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

/* ================= GET SIGNED URL FOR PROOF IMAGE ================= */
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
      { expiresIn: 60 } // URL valid for 60 seconds
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