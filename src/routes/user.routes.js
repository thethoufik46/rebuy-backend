import express from "express";

import { GetObjectCommand } from "@aws-sdk/client-s3";

import { verifyToken } from "../middleware/auth.js";

import uploadUser from "../middleware/uploadUser.js";

import User from "../models/user_model.js";

import r2 from "../config/r2.js";

import {
  uploadUserImage,
  deleteUserImage,
} from "../utils/userUpload.js";

const router = express.Router();

// ==================================================
// USER PROFILE IMAGE
//
// USER CAN:
// ✅ Upload / replace profile image
//
// USER CANNOT:
// ❌ Upload gallery
// ❌ Edit gallery
// ❌ Delete gallery
// ❌ Change status
// ❌ Change userType
// ❌ Change highlight
// ❌ Change alternate phone
// ==================================================

router.post(
  "/upload-profile",
  verifyToken,
  uploadUser.fields([
    {
      name: "profileImage",
      maxCount: 1,
    },
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user.id
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // ==================================================
      // PROFILE IMAGE ONLY
      // ==================================================

      if (
        req.files?.profileImage?.length
      ) {
        if (user.profileImage) {
          await deleteUserImage(
            user.profileImage
          );
        }

        user.profileImage =
          await uploadUserImage(
            req.files.profileImage[0],
            "users/profile"
          );
      }

      await user.save();

      return res.json({
        success: true,
        message:
          "Profile image updated successfully",

        profileImage:
          user.profileImage || "",

        // Gallery is VIEW ONLY
        galleryImages:
          user.galleryImages || [],

        // Read-only fields
        status:
          user.status || "not_verified",

        userType:
          user.userType || "others",

        alternatePhone:
          user.alternatePhone || "",

        highlightText:
          user.highlightText || "",
      });
    } catch (err) {
      console.error(
        "USER PROFILE UPLOAD ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Profile image upload failed",
      });
    }
  }
);

// ==================================================
// DELETE USER PROFILE IMAGE
//
// USER CAN DELETE ONLY PROFILE IMAGE
// ==================================================

router.delete(
  "/profile-image",
  verifyToken,
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user.id
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.profileImage) {
        await deleteUserImage(
          user.profileImage
        );

        user.profileImage = "";

        await user.save();
      }

      return res.json({
        success: true,
        message:
          "Profile image deleted",
        profileImage: "",
      });
    } catch (err) {
      console.error(
        "DELETE PROFILE IMAGE ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Delete failed",
      });
    }
  }
);

// ==================================================
// VIEW IMAGE
//
// PUBLIC
// No token required
// ==================================================

router.get(
  "/image/*",
  async (req, res) => {
    try {
      const key = req.params[0];

      if (!key) {
        return res.status(400).json({
          success: false,
          message:
            "Image key is required",
        });
      }

      const command =
        new GetObjectCommand({
          Bucket:
            process.env.R2_BUCKET,
          Key: key,
        });

      const data =
        await r2.send(command);

      res.setHeader(
        "Content-Type",
        data.ContentType ||
          "application/octet-stream"
      );

      if (data.ContentLength) {
        res.setHeader(
          "Content-Length",
          data.ContentLength
        );
      }

      res.setHeader(
        "Cache-Control",
        "public, max-age=31536000, immutable"
      );

      if (data.Body) {
        data.Body.pipe(res);
      } else {
        return res.status(404).json({
          success: false,
          message:
            "Image not found",
        });
      }
    } catch (err) {
      console.error(
        "IMAGE VIEW ERROR:",
        err.message
      );

      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }
  }
);

// ==================================================
// GET MY PROFILE
//
// USER CAN VIEW:
// ✅ Profile image
// ✅ Gallery
// ✅ Status
// ✅ User Type
// ✅ Alternate phone
// ✅ Highlight
//
// THESE ARE READ ONLY FOR USER
// ==================================================

router.get(
  "/profile",
  verifyToken,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user.id
        ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      return res.json({
        success: true,

        user: {
          _id: user._id,

          name: user.name,

          phone: user.phone,

          // EMAIL OPTIONAL
          email:
            user.email || "",

          category:
            user.category,

          district:
            user.district,

          address:
            user.address || "NA",

          role:
            user.role,

          // =================================================
          // STATUS
          // =================================================
          // Badge must use ONLY this field.
          // =================================================

          status:
            user.status ||
            "not_verified",

          // =================================================
          // USER TYPE
          // =================================================
          // Does NOT control badge.
          // =================================================

          userType:
            user.userType ||
            "others",

          // =================================================
          // OPTIONAL
          // =================================================

          alternatePhone:
            user.alternatePhone ||
            "",

          highlightText:
            user.highlightText ||
            "",

          // =================================================
          // PROFILE IMAGE
          // =================================================

          profileImage:
            user.profileImage ||
            "",

          // =================================================
          // GALLERY
          // VIEW ONLY
          // =================================================

          galleryImages:
            user.galleryImages ||
            [],

          createdAt:
            user.createdAt,

          updatedAt:
            user.updatedAt,
        },
      });
    } catch (err) {
      console.error(
        "GET USER PROFILE ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch profile",
      });
    }
  }
);

// ==================================================
// IMPORTANT
//
// NO USER GALLERY ROUTES HERE
//
// ❌ POST   /gallery
// ❌ PUT    /gallery
// ❌ PATCH  /gallery
// ❌ DELETE /gallery/:index
// ❌ DELETE /gallery
//
// Gallery is ADMIN ONLY.
// ==================================================

export default router;