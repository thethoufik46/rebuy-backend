// ======================= src/routes/user.routes.js =======================

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

/* ==================================================
   UPLOAD / EDIT PROFILE + GALLERY
================================================== */

router.post(
  "/upload-profile",
  verifyToken,
  uploadUser.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      /* ================= PROFILE IMAGE ================= */

      if (req.files?.profileImage?.length) {

        if (user.profileImage) {
          await deleteUserImage(user.profileImage);
        }

        user.profileImage = await uploadUserImage(
          req.files.profileImage[0],
          "users/profile"
        );
      }

      /* ================= EXISTING GALLERY ================= */

      if (req.body.existingGallery !== undefined) {

        let existingGallery;

        try {
          existingGallery = Array.isArray(req.body.existingGallery)
            ? req.body.existingGallery
            : JSON.parse(req.body.existingGallery);

        } catch {

          existingGallery = user.galleryImages || [];
        }

        if (Array.isArray(existingGallery)) {

          const imagesToDelete =
            (user.galleryImages || []).filter(
              (img) => !existingGallery.includes(img)
            );

          for (const img of imagesToDelete) {
            await deleteUserImage(img);
          }

          user.galleryImages = existingGallery;
        }
      }

      /* ================= NEW GALLERY ================= */

      if (req.files?.gallery?.length) {

        const newGallery = await Promise.all(

          req.files.gallery.map((img) =>
            uploadUserImage(
              img,
              "users/gallery"
            )
          )

        );

        user.galleryImages = [
          ...(user.galleryImages || []),
          ...newGallery,
        ];
      }


            /* ================= SAVE ================= */

      await user.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
        profileImage: user.profileImage,
        galleryImages: user.galleryImages,
      });

    } catch (err) {

      console.error("USER UPLOAD ERROR:", err);

      res.status(500).json({
        success: false,
        message: "Image upload failed",
      });

    }
  }
);

/* ==================================================
   DELETE PROFILE IMAGE
================================================== */

router.delete(
  "/profile-image",
  verifyToken,
  async (req, res) => {
    try {

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.profileImage) {
        await deleteUserImage(user.profileImage);
        user.profileImage = "";
      }

      await user.save();

      res.json({
        success: true,
        message: "Profile image deleted",
      });

    } catch (err) {

      console.error("DELETE PROFILE ERROR:", err);

      res.status(500).json({
        success: false,
        message: "Delete failed",
      });

    }
  }
);

/* ==================================================
   DELETE SINGLE GALLERY IMAGE
================================================== */

router.delete(
  "/gallery/:index",
  verifyToken,
  async (req, res) => {
    try {

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const index = Number(req.params.index);

      if (
        isNaN(index) ||
        index < 0 ||
        index >= user.galleryImages.length
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid gallery index",
        });
      }

      const image = user.galleryImages[index];

      await deleteUserImage(image);

      user.galleryImages.splice(index, 1);

      await user.save();

      res.json({
        success: true,
        message: "Gallery image deleted",
        galleryImages: user.galleryImages,
      });

    } catch (err) {

      console.error("DELETE GALLERY ERROR:", err);

      res.status(500).json({
        success: false,
        message: "Delete failed",
      });

    }
  }
);

/* ==================================================
   DELETE ALL GALLERY IMAGES
================================================== */

router.delete(
  "/gallery",
  verifyToken,
  async (req, res) => {
    try {

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      for (const img of user.galleryImages || []) {
        await deleteUserImage(img);
      }

      user.galleryImages = [];

      await user.save();

      res.json({
        success: true,
        message: "All gallery images deleted",
      });

    } catch (err) {

      console.error("DELETE ALL GALLERY ERROR:", err);

      res.status(500).json({
        success: false,
        message: "Delete failed",
      });

    }
  }
);

/* ==================================================
   VIEW IMAGE (WEB + ANDROID SAFE)
================================================== */

router.get("/image/*", async (req, res) => {
  try {
    const key = req.params[0];

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    const data = await r2.send(command);

    res.setHeader(
      "Content-Type",
      data.ContentType || "application/octet-stream"
    );

    if (data.ContentLength) {
      res.setHeader("Content-Length", data.ContentLength);
    }

    res.setHeader(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );

    data.Body.pipe(res);

  } catch (err) {

    console.error("IMAGE VIEW ERROR:", err.message);

    res.status(404).json({
      success: false,
      message: "Image not found",
    });

  }
});

/* ==================================================
   GET MY PROFILE
================================================== */

router.get(
  "/profile",
  verifyToken,
  async (req, res) => {
    try {

      const user = await User.findById(req.user.id).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        user,
      });

    } catch (err) {

      console.error("GET PROFILE ERROR:", err);

      res.status(500).json({
        success: false,
        message: "Failed to fetch profile",
      });

    }
  }
);

/* ==================================================
   EXPORT
================================================== */

export default router;