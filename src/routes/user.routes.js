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
      // ==================================================
      // FIND USER
      // ==================================================

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // ==================================================
      // PROFILE IMAGE ONLY
      // ==================================================

      if (req.files?.profileImage?.length) {
        // ------------------------------------------------
        // DELETE OLD PROFILE IMAGE
        // ------------------------------------------------

        if (user.profileImage) {
          await deleteUserImage(
            user.profileImage
          );
        }

        // ------------------------------------------------
        // UPLOAD NEW PROFILE IMAGE
        // ------------------------------------------------

        user.profileImage =
          await uploadUserImage(
            req.files.profileImage[0],
            "users/profile"
          );
      }

      // ==================================================
      // SAVE
      // ==================================================

      await user.save();

      // ==================================================
      // RESPONSE
      // ==================================================

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
          user.status ||
          "not_verified",

        userType:
          user.userType ||
          "others",

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
      // ==================================================
      // FIND USER
      // ==================================================

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
      // DELETE PROFILE IMAGE
      // ==================================================

      if (user.profileImage) {
        await deleteUserImage(
          user.profileImage
        );

        user.profileImage = "";

        await user.save();
      }

      // ==================================================
      // RESPONSE
      // ==================================================

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
      // ==================================================
      // IMAGE KEY
      // ==================================================

      const key = req.params[0];

      if (!key) {
        return res.status(400).json({
          success: false,
          message:
            "Image key is required",
        });
      }

      // ==================================================
      // R2 GET OBJECT
      // ==================================================

      const command =
        new GetObjectCommand({
          Bucket:
            process.env.R2_BUCKET,

          Key: key,
        });

      const data =
        await r2.send(command);

      // ==================================================
      // CONTENT TYPE
      // ==================================================

      res.setHeader(
        "Content-Type",
        data.ContentType ||
          "application/octet-stream"
      );

      // ==================================================
      // CONTENT LENGTH
      // ==================================================

      if (
        data.ContentLength !==
        undefined
      ) {
        res.setHeader(
          "Content-Length",
          data.ContentLength
        );
      }

      // ==================================================
      // CACHE
      // ==================================================

      res.setHeader(
        "Cache-Control",
        "public, max-age=31536000, immutable"
      );

      // ==================================================
      // STREAM
      // ==================================================

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
        err?.message
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
// USER CAN EDIT:
// ✅ Name
// ✅ Alternate phone
// ✅ District
// ✅ Address
//
// THESE ARE READ ONLY:
// ❌ Phone
// ❌ Email
// ❌ Category
// ❌ Status
// ❌ User Type
// ❌ Highlight
// ❌ Gallery
// ==================================================

router.get(
  "/profile",
  verifyToken,

  async (req, res) => {
    try {
      // ==================================================
      // FIND USER
      // ==================================================

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

      // ==================================================
      // RESPONSE
      // ==================================================

      return res.json({
        success: true,

        user: {
          _id: user._id,

          name: user.name,

          // PHONE IS NOW STRING
          phone: user.phone || "",

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

          status:
            user.status ||
            "not_verified",

          // =================================================
          // USER TYPE
          // =================================================

          userType:
            user.userType ||
            "others",

          // =================================================
          // ALTERNATE PHONE
          // =================================================

          alternatePhone:
            user.alternatePhone ||
            "",

          // =================================================
          // HIGHLIGHT
          // =================================================

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
          //
          // ARRAY
          // =================================================

          galleryImages:
            Array.isArray(
              user.galleryImages
            )
              ? user.galleryImages
              : [],

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
// UPDATE MY PROFILE
//
// USER CAN UPDATE:
// ✅ name
// ✅ alternatePhone
// ✅ district
// ✅ address
//
// USER CANNOT UPDATE:
// ❌ phone
// ❌ email
// ❌ category
// ❌ status
// ❌ userType
// ❌ highlightText
// ❌ gallery
// ❌ role
// ==================================================

router.put(
  "/profile",
  verifyToken,

  async (req, res) => {
    try {
      let {
        name,
        alternatePhone,
        district,
        address,
      } = req.body;

      // ==================================================
      // FIND USER
      // ==================================================

      const user =
        await User.findById(
          req.user.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      // ==================================================
      // NAME
      // MAXIMUM 50 CHARACTERS
      // ==================================================

      if (name !== undefined) {
        name = name
          .toString()
          .trim();

        if (!name) {
          return res.status(400).json({
            success: false,
            message:
              "Name is required",
          });
        }

        if (name.length > 50) {
          return res.status(400).json({
            success: false,
            message:
              "Name must not exceed 50 characters",
          });
        }

        user.name = name;
      }

      // ==================================================
      // ALTERNATE PHONE
      //
      // USER CAN EDIT
      // OPTIONAL
      // 10 DIGITS ONLY
      // ==================================================

      if (
        alternatePhone !==
        undefined
      ) {
        alternatePhone =
          alternatePhone
            .toString()
            .replace(/\s+/g, "")
            .trim();

        if (
          alternatePhone !== "" &&
          !/^[0-9]{10}$/.test(
            alternatePhone
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Alternate phone must contain 10 digits",
          });
        }

        user.alternatePhone =
          alternatePhone;
      }

      // ==================================================
      // DISTRICT
      // ==================================================

      if (
        district !== undefined
      ) {
        district =
          district
            .toString()
            .trim();

        if (!district) {
          return res.status(400).json({
            success: false,
            message:
              "District is required",
          });
        }

        user.district =
          district;
      }

      // ==================================================
      // ADDRESS
      // MAXIMUM 500 CHARACTERS
      // ==================================================

      if (
        address !== undefined
      ) {
        address =
          address
            .toString()
            .trim();

        if (address.length > 500) {
          return res.status(400).json({
            success: false,
            message:
              "Address must not exceed 500 characters",
          });
        }

        user.address =
          address || "NA";
      }

      // ==================================================
      // SAVE
      //
      // District validation from
      // user schema will run here.
      // ==================================================

      await user.save();

      // ==================================================
      // REMOVE PASSWORD
      // ==================================================

      const userResponse =
        user.toObject();

      delete userResponse.password;

      // ==================================================
      // RESPONSE
      // ==================================================

      return res.json({
        success: true,

        message:
          "Profile updated successfully",

        user: userResponse,
      });
    } catch (err) {
      console.error(
        "UPDATE USER PROFILE ERROR:",
        err
      );

      // ==================================================
      // INVALID DISTRICT
      // ==================================================

      if (
        err?.message ===
        "Invalid district"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid district",
        });
      }

      // ==================================================
      // DISTRICT REQUIRED
      // ==================================================

      if (
        err?.message ===
        "District is required"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "District is required",
        });
      }

      // ==================================================
      // MONGOOSE MAXLENGTH VALIDATION
      // ==================================================

      if (
        err?.name ===
        "ValidationError"
      ) {
        const messages =
          Object.values(
            err.errors || {}
          ).map(
            (e) => e.message
          );

        return res.status(400).json({
          success: false,
          message:
            messages[0] ||
            "Invalid profile data",
        });
      }

      // ==================================================
      // DUPLICATE EMAIL
      // ==================================================

      if (err?.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "Email already exists",
        });
      }

      // ==================================================
      // OTHER ERROR
      // ==================================================

      return res.status(500).json({
        success: false,
        message:
          "Profile update failed",
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