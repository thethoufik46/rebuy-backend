import express from "express";
import bcrypt from "bcryptjs";

import { verifyToken, isAdmin } from "../middleware/auth.js";
import uploadUser from "../middleware/uploadUser.js";

import User from "../models/user_model.js";

import {
  uploadUserImage,
  deleteUserImage,
} from "../utils/userUpload.js";

const router = express.Router();

/* ==================================================
   CREATE USER
================================================== */
router.post(
  "/users",
  verifyToken,
  isAdmin,
  uploadUser.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        phone,
        email,
        password,
        category,
        district,
        address,
        role,
        verification,
      } = req.body;

      if (!name || !phone || !password || !category || !district) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone already exists",
        });
      }

      if (email) {
        const existingEmail = await User.findOne({
          email: email.toLowerCase(),
        });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        name,
        phone: [phone],
        email: email?.toLowerCase() || "",
        password: hashedPassword,
        category,
        district,
        address: address || "NA",
        role: role || "user",
        verification: verification || "others",
      });

      if (req.files?.profileImage?.length) {
        user.profileImage = await uploadUserImage(
          req.files.profileImage[0],
          "users/profile"
        );
      }

      if (req.files?.gallery?.length) {
        user.galleryImages = await Promise.all(
          req.files.gallery.map((img) =>
            uploadUserImage(img, "users/gallery")
          )
        );
      }

      await user.save();

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user,
      });
    } catch (err) {
      console.error("CREATE USER ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Failed to create user",
      });
    }
  }
);

/* ==================================================
   GET ALL USERS (paginated + search)
================================================== */
router.get(
  "/users",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = req.query.search || "";

      const query = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $elemMatch: { $regex: search, $options: "i" } } },
        ];
      }

      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.json({
        success: true,
        total,
        page,
        pages: Math.ceil(total / limit),
        users,
      });
    } catch (err) {
      console.error("GET USERS ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
      });
    }
  }
);

/* ==================================================
   GET SINGLE USER
================================================== */
router.get(
  "/users/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select("-password");
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
      console.error("GET USER ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user",
      });
    }
  }
);

/* ==================================================
   UPDATE USER (with image handling)
================================================== */
router.put(
  "/users/:id",
  verifyToken,
  isAdmin,
  uploadUser.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const {
        name,
        phone,
        email,
        category,
        district,
        address,
        role,
        verification,
      } = req.body;

      // Basic fields
      if (name !== undefined) user.name = name;
      if (phone !== undefined) {
        user.phone = Array.isArray(phone) ? phone : [phone];
      }
      if (email !== undefined) user.email = email.toLowerCase();
      if (category !== undefined) user.category = category;
      if (district !== undefined) user.district = district;
      if (address !== undefined) user.address = address;
      if (role !== undefined) user.role = role;
      if (verification !== undefined) user.verification = verification;

      // Profile image
      if (req.files?.profileImage?.length) {
        if (user.profileImage) {
          await deleteUserImage(user.profileImage);
        }
        user.profileImage = await uploadUserImage(
          req.files.profileImage[0],
          "users/profile"
        );
      }

      // Existing gallery (keep only those listed)
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
          const imagesToDelete = (user.galleryImages || []).filter(
            (img) => !existingGallery.includes(img)
          );
          for (const img of imagesToDelete) {
            await deleteUserImage(img);
          }
          user.galleryImages = existingGallery;
        }
      }

      // New gallery images
      if (req.files?.gallery?.length) {
        const newGallery = await Promise.all(
          req.files.gallery.map((img) =>
            uploadUserImage(img, "users/gallery")
          )
        );
        user.galleryImages = [...(user.galleryImages || []), ...newGallery];
      }

      await user.save();

      res.json({
        success: true,
        message: "User updated successfully",
        user,
      });
    } catch (err) {
      console.error("UPDATE USER ERROR:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Update failed",
      });
    }
  }
);

/* ==================================================
   CHANGE VERIFICATION (admin)
================================================== */
router.patch(
  "/users/:id/verification",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { verification } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      user.verification = verification;
      await user.save();
      res.json({
        success: true,
        message: "Verification updated",
        verification: user.verification,
      });
    } catch (err) {
      console.error("VERIFY ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Failed to update verification",
      });
    }
  }
);

/* ==================================================
   CHANGE ROLE (admin)
================================================== */
router.patch(
  "/users/:id/role",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { role } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      user.role = role;
      await user.save();
      res.json({
        success: true,
        message: "Role updated",
        role: user.role,
      });
    } catch (err) {
      console.error("ROLE ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Failed to update role",
      });
    }
  }
);

/* ==================================================
   DELETE USER (cleans profile + gallery images)
================================================== */
router.delete(
  "/users/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Delete profile image
      if (user.profileImage) {
        await deleteUserImage(user.profileImage);
      }

      // Delete all gallery images
      for (const img of user.galleryImages || []) {
        await deleteUserImage(img);
      }

      await User.findByIdAndDelete(user._id);

      res.json({
        success: true,
        message: "User and all images deleted successfully",
      });
    } catch (err) {
      console.error("DELETE USER ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Delete failed",
      });
    }
  }
);

/* ==================================================
   DELETE PROFILE IMAGE (admin)
================================================== */
router.delete(
  "/users/:id/profile-image",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
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
   DELETE SINGLE GALLERY IMAGE (admin)
================================================== */
router.delete(
  "/users/:id/gallery/:index",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      const index = Number(req.params.index);
      if (isNaN(index) || index < 0 || index >= user.galleryImages.length) {
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
   DELETE ALL GALLERY IMAGES (admin)
================================================== */
router.delete(
  "/users/:id/gallery",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
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

export default router;