import express from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { verifyToken } from "../../middleware/auth.js";
import uploadUser from "../../middleware/user/uploadUser.js";
import User from "../../models/user/user_model.js";
import r2 from "../../config/r2.js";
import {
  uploadUserImage,
  deleteUserImage,
} from "../../utils/user/userUpload.js";

const router = express.Router();

// ==================================================
// USER PROFILE IMAGE UPLOAD
// POST /users/upload-profile
// ==================================================
router.post(
  "/upload-profile",
  verifyToken,
  uploadUser.fields([{ name: "profileImage", maxCount: 1 }]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (req.files?.profileImage?.length) {
        // Delete old profile image
        if (user.profileImage) {
          await deleteUserImage(user.profileImage);
        }

        // Upload new profile image
        user.profileImage = await uploadUserImage(
          req.files.profileImage[0],
          "users/profile"
        );
      }

      await user.save();

      return res.json({
        success: true,
        message: "Profile image updated successfully",
        profileImage: user.profileImage || "",
        galleryImages: user.galleryImages || [],
        status: user.status || "not_verified",
        userType: user.userType || "others",
        alternatePhone: user.alternatePhone || "",
        highlightText: user.highlightText || "",
        language: user.language || "en",
      });
    } catch (err) {
      console.error("USER PROFILE UPLOAD ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Profile image upload failed",
      });
    }
  }
);

// ==================================================
// DELETE USER PROFILE IMAGE
// DELETE /users/profile-image
// ==================================================
router.delete("/profile-image", verifyToken, async (req, res) => {
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
      await user.save();
    }

    return res.json({
      success: true,
      message: "Profile image deleted",
      profileImage: "",
    });
  } catch (err) {
    console.error("DELETE PROFILE IMAGE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});

// ==================================================
// VIEW IMAGE (PUBLIC)
// GET /users/image/*
// ==================================================
router.get("/image/*", async (req, res) => {
  try {
    const key = req.params[0];

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Image key is required",
      });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    const data = await r2.send(command);

    res.setHeader(
      "Content-Type",
      data.ContentType || "application/octet-stream"
    );

    if (data.ContentLength !== undefined) {
      res.setHeader("Content-Length", data.ContentLength);
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
        message: "Image not found",
      });
    }
  } catch (err) {
    console.error("IMAGE VIEW ERROR:", err?.message);

    return res.status(404).json({
      success: false,
      message: "Image not found",
    });
  }
});

// ==================================================
// GET MY PROFILE
// GET /users/profile
// ==================================================
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone || "",
        email: user.email || "",
        category: user.category,
        district: user.district,
        address: user.address || "NA",
        role: user.role,
        googleName: user.googleName || "",
        googleId: user.googleId || "",
        googleProfileImage: user.googleProfileImage || "",
        status: user.status || "not_verified",
        userType: user.userType || "others",
        language: user.language || "en",
        alternatePhone: user.alternatePhone || "",
        highlightText: user.highlightText || "",
        profileImage: user.profileImage || "",
        galleryImages: Array.isArray(user.galleryImages)
          ? user.galleryImages
          : [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("GET USER PROFILE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

// ==================================================
// UPDATE MY PROFILE
// PUT /users/profile
// ==================================================
router.put("/profile", verifyToken, async (req, res) => {
  try {
    let { name, alternatePhone, district, address, language } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Name
    if (name !== undefined) {
      name = name.toString().trim();

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Name is required",
        });
      }

      if (name.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Name must not exceed 50 characters",
        });
      }

      user.name = name;
    }

    // Alternate Phone
    if (alternatePhone !== undefined) {
      alternatePhone = alternatePhone
        .toString()
        .replace(/\s+/g, "")
        .trim();

      if (alternatePhone !== "" && !/^[0-9]{10}$/.test(alternatePhone)) {
        return res.status(400).json({
          success: false,
          message: "Alternate phone must contain 10 digits",
        });
      }

      user.alternatePhone = alternatePhone;
    }

    // District
    if (district !== undefined) {
      district = district.toString().trim();

      if (!district) {
        return res.status(400).json({
          success: false,
          message: "District is required",
        });
      }

      user.district = district;
    }

    // Address
    if (address !== undefined) {
      address = address.toString().trim();

      if (address.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Address must not exceed 500 characters",
        });
      }

      user.address = address || "NA";
    }

    // Language
    if (language !== undefined) {
      language = language.toString().trim().toLowerCase();

      const allowedLanguages = [
        "en", "ta", "ml", "te", "hi", "kn",
        "bn", "mr", "gu", "ur", "or",
      ];

      if (!allowedLanguages.includes(language)) {
        return res.status(400).json({
          success: false,
          message: "Invalid language",
        });
      }

      user.language = language;
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (err) {
    console.error("UPDATE USER PROFILE ERROR:", err);

    if (err?.message === "Invalid district") {
      return res.status(400).json({
        success: false,
        message: "Invalid district",
      });
    }

    if (err?.message === "District is required") {
      return res.status(400).json({
        success: false,
        message: "District is required",
      });
    }

    if (err?.name === "ValidationError") {
      const messages = Object.values(err.errors || {}).map((e) => e.message);

      return res.status(400).json({
        success: false,
        message: messages[0] || "Invalid profile data",
      });
    }

    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Profile update failed",
    });
  }
});

export default router;