import express from "express";
import mongoose from "mongoose";
import User from "../../models/user/user_model.js";
import { verifyToken, verifyAdmin } from "../../middleware/auth.js";
import uploadUser from "../../middleware/user/uploadUser.js";
import {
  uploadUserImage,
  deleteUserImage,
} from "../../utils/user/userUpload.js";

const router = express.Router();

// ==================================================
// ALL ADMIN ROUTES REQUIRE:
// ✅ Valid token
// ✅ Admin role
// ==================================================
router.use(verifyToken, verifyAdmin);

// ==================================================
// GET ALL USERS (with pagination + filters)
// GET /admin/users
// ==================================================
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      category = "",
      userType = "",
      status = "",
      role = "",
      district = "",
    } = req.query;

    const query = {};

    // Search by name or phone
    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { phone: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (category.trim()) query.category = category.trim();
    if (userType.trim()) query.userType = userType.trim();
    if (status.trim()) query.status = status.trim();
    if (role.trim()) query.role = role.trim();
    if (district.trim()) query.district = district.trim();

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select("-password -adminActiveToken -resetOtp -resetOtpExpiry")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Add forgotRequest flag (if user requested password reset)
    const formattedUsers = users.map((u) => ({
      ...u,
      forgotRequest: u.resetOtp !== null && u.resetOtp !== undefined,
      requestedPassword: u.resetOtp || null,
    }));

    return res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      users: formattedUsers,
    });
  } catch (err) {
    console.error("ADMIN GET USERS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

// ==================================================
// GET SINGLE USER
// GET /admin/users/:id
// ==================================================
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(req.params.id).select(
      "-password -adminActiveToken"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("ADMIN GET USER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

// ==================================================
// CREATE USER
// POST /admin/users
// ==================================================
router.post(
  "/",
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
        googleName,
        googleId,
        googleProfileImage,
        password,
        category,
        district,
        address,
        role,
        userType,
        status,
        alternatePhone,
        highlightText,
      } = req.body;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name is required",
        });
      }

      if (!phone || !/^\d{10}$/.test(phone.replace(/\s+/g, ""))) {
        return res.status(400).json({
          success: false,
          message: "Phone must be exactly 10 digits",
        });
      }

      if (!password || !/^\d{6,10}$/.test(password)) {
        return res.status(400).json({
          success: false,
          message: "Password must be 6-10 digits",
        });
      }

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Category is required",
        });
      }

      if (!district) {
        return res.status(400).json({
          success: false,
          message: "District is required",
        });
      }

      // Check duplicate phone
      const existing = await User.findOne({
        phone: phone.replace(/\s+/g, ""),
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Phone number already exists",
        });
      }

      // Check duplicate email
      if (email && email.trim()) {
        const emailExists = await User.findOne({
          email: email.trim().toLowerCase(),
        });

        if (emailExists) {
          return res.status(409).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      // Hash password
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.default.hash(password.trim(), 10);

      // Upload profile image
      let profileImagePath = "";
      if (req.files?.profileImage?.length) {
        profileImagePath = await uploadUserImage(
          req.files.profileImage[0],
          "users/profile"
        );
      }

      // Upload gallery images
      const galleryPaths = [];
      if (req.files?.gallery?.length) {
        for (const file of req.files.gallery) {
          const path = await uploadUserImage(file, "users/gallery");
          if (path) galleryPaths.push(path);
        }
      }

      // Create user
      const newUser = new User({
        name: name.trim(),
        phone: phone.replace(/\s+/g, "").trim(),
        email: email?.trim().toLowerCase() || undefined,
        googleName: googleName?.trim() || "NA",
        googleId: googleId?.trim() || "NA",
        googleProfileImage: googleProfileImage?.trim() || "",
        password: hashedPassword,
        category: category.trim(),
        district: district.trim(),
        address: address?.trim() || "NA",
        role: role?.trim() || "user",
        userType: userType?.trim() || "others",
        status: status?.trim() || "not_verified",
        alternatePhone: alternatePhone?.replace(/\s+/g, "").trim() || "",
        highlightText: highlightText?.trim() || "",
        profileImage: profileImagePath,
        galleryImages: galleryPaths,
      });

      await newUser.save();

      const userResponse = newUser.toObject();
      delete userResponse.password;
      delete userResponse.adminActiveToken;

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        user: userResponse,
      });
    } catch (err) {
      console.error("ADMIN CREATE USER ERROR:", err);

      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Duplicate field value",
        });
      }

      if (err.name === "ValidationError") {
        const msg = Object.values(err.errors || {})
          .map((e) => e.message)
          .join(", ");
        return res.status(400).json({
          success: false,
          message: msg || "Validation error",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create user",
      });
    }
  }
);

// ==================================================
// UPDATE USER
// PUT /admin/users/:id
// ==================================================
router.put(
  "/:id",
  uploadUser.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

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
        password,
        category,
        district,
        address,
        role,
        userType,
        status,
        alternatePhone,
        highlightText,
        existingGallery,
      } = req.body;

      // Name
      if (name !== undefined) {
        if (!name.trim()) {
          return res.status(400).json({
            success: false,
            message: "Name is required",
          });
        }
        user.name = name.trim();
      }

      // Phone
      if (phone !== undefined) {
        const cleanPhone = phone.replace(/\s+/g, "").trim();
        if (!/^\d{10}$/.test(cleanPhone)) {
          return res.status(400).json({
            success: false,
            message: "Phone must be exactly 10 digits",
          });
        }
        // Check if phone already exists for another user
        const existingPhone = await User.findOne({
          phone: cleanPhone,
          _id: { $ne: user._id },
        });
        if (existingPhone) {
          return res.status(409).json({
            success: false,
            message: "Phone number already exists",
          });
        }
        user.phone = cleanPhone;
      }

      // Email
      if (email !== undefined) {
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail) {
          const existingEmail = await User.findOne({
            email: cleanEmail,
            _id: { $ne: user._id },
          });
          if (existingEmail) {
            return res.status(409).json({
              success: false,
              message: "Email already exists",
            });
          }
        }
        user.email = cleanEmail || user.email;
      }

      // Password
      if (password && password.trim()) {
        if (!/^\d{6,10}$/.test(password.trim())) {
          return res.status(400).json({
            success: false,
            message: "Password must be 6-10 digits",
          });
        }
        const bcrypt = await import("bcrypt");
        user.password = await bcrypt.default.hash(password.trim(), 10);
      }

      // Category
      if (category !== undefined) user.category = category.trim();

      // District
      if (district !== undefined) user.district = district.trim();

      // Address
      if (address !== undefined) user.address = address.trim() || "NA";

      // Role
      if (role !== undefined) user.role = role.trim();

      // User Type
      if (userType !== undefined) user.userType = userType.trim();

      // Status
      if (status !== undefined) user.status = status.trim();

      // Alternate Phone
      if (alternatePhone !== undefined) {
        const cleanAlt = alternatePhone.replace(/\s+/g, "").trim();
        if (cleanAlt && !/^\d{10}$/.test(cleanAlt)) {
          return res.status(400).json({
            success: false,
            message: "Alternate phone must be 10 digits",
          });
        }
        user.alternatePhone = cleanAlt;
      }

      // Highlight
      if (highlightText !== undefined) {
        if (highlightText.trim().length > 250) {
          return res.status(400).json({
            success: false,
            message: "Highlight cannot exceed 250 characters",
          });
        }
        user.highlightText = highlightText.trim();
      }

      // Profile Image
      if (req.files?.profileImage?.length) {
        if (user.profileImage) {
          await deleteUserImage(user.profileImage);
        }
        user.profileImage = await uploadUserImage(
          req.files.profileImage[0],
          "users/profile"
        );
      }

      // Gallery (existing + new)
      let galleryList = [];
      if (existingGallery) {
        try {
          galleryList = JSON.parse(existingGallery);
        } catch (e) {
          galleryList = [];
        }
      } else {
        galleryList = user.galleryImages || [];
      }

      // Delete gallery images that are no longer in the list
      if (user.galleryImages && user.galleryImages.length > 0) {
        const toDelete = user.galleryImages.filter(
          (img) => !galleryList.includes(img)
        );
        for (const img of toDelete) {
          await deleteUserImage(img);
        }
      }

      // Upload new gallery images
      if (req.files?.gallery?.length) {
        for (const file of req.files.gallery) {
          const path = await uploadUserImage(file, "users/gallery");
          if (path) galleryList.push(path);
        }
      }

      user.galleryImages = galleryList;

      await user.save();

      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.adminActiveToken;

      return res.json({
        success: true,
        message: "User updated successfully",
        user: userResponse,
      });
    } catch (err) {
      console.error("ADMIN UPDATE USER ERROR:", err);

      if (err.name === "ValidationError") {
        const msg = Object.values(err.errors || {})
          .map((e) => e.message)
          .join(", ");
        return res.status(400).json({
          success: false,
          message: msg || "Validation error",
        });
      }

      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Duplicate field value",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to update user",
      });
    }
  }
);

// ==================================================
// DELETE USER
// DELETE /admin/users/:id
// ==================================================
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

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

    // Delete gallery images
    if (user.galleryImages && user.galleryImages.length > 0) {
      for (const img of user.galleryImages) {
        await deleteUserImage(img);
      }
    }

    await User.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("ADMIN DELETE USER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
});

// ==================================================
// UPDATE STATUS
// PATCH /admin/users/:id/status
// ==================================================
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["not_verified", "verified"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password -adminActiveToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Status updated",
      user,
    });
  } catch (err) {
    console.error("ADMIN UPDATE STATUS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
});

// ==================================================
// UPDATE USER TYPE
// PATCH /admin/users/:id/user-type
// ==================================================
router.patch("/:id/user-type", async (req, res) => {
  try {
    const { userType } = req.body;

    const allowed = [
      "verified",
      "mediator",
      "dealer",
      "premium",
      "others",
      "partner",
      "black",
    ];

    if (!allowed.includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { userType },
      { new: true }
    ).select("-password -adminActiveToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "User type updated",
      user,
    });
  } catch (err) {
    console.error("ADMIN UPDATE USER TYPE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update user type",
    });
  }
});

// ==================================================
// UPDATE ROLE
// PATCH /admin/users/:id/role
// ==================================================
router.patch("/:id/role", async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password -adminActiveToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Role updated",
      user,
    });
  } catch (err) {
    console.error("ADMIN UPDATE ROLE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update role",
    });
  }
});

// ==================================================
// UPDATE HIGHLIGHT
// PATCH /admin/users/:id/highlight
// ==================================================
router.patch("/:id/highlight", async (req, res) => {
  try {
    const { highlightText } = req.body;

    if (highlightText && highlightText.trim().length > 250) {
      return res.status(400).json({
        success: false,
        message: "Highlight cannot exceed 250 characters",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { highlightText: highlightText?.trim() || "" },
      { new: true }
    ).select("-password -adminActiveToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Highlight updated",
      user,
    });
  } catch (err) {
    console.error("ADMIN UPDATE HIGHLIGHT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update highlight",
    });
  }
});

// ==================================================
// UPDATE ALTERNATE PHONE
// PATCH /admin/users/:id/alternate-phone
// ==================================================
router.patch("/:id/alternate-phone", async (req, res) => {
  try {
    const { alternatePhone } = req.body;

    const clean = alternatePhone?.replace(/\s+/g, "").trim() || "";

    if (clean && !/^\d{10}$/.test(clean)) {
      return res.status(400).json({
        success: false,
        message: "Alternate phone must be 10 digits",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { alternatePhone: clean },
      { new: true }
    ).select("-password -adminActiveToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Alternate phone updated",
      user,
    });
  } catch (err) {
    console.error("ADMIN UPDATE ALTERNATE PHONE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update alternate phone",
    });
  }
});

// ==================================================
// DELETE PROFILE IMAGE
// DELETE /admin/users/:id/profile-image
// ==================================================
router.delete("/:id/profile-image", async (req, res) => {
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

    return res.json({
      success: true,
      message: "Profile image deleted",
    });
  } catch (err) {
    console.error("ADMIN DELETE PROFILE IMAGE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete profile image",
    });
  }
});

// ==================================================
// DELETE SINGLE GALLERY IMAGE
// DELETE /admin/users/:id/gallery/:index
// ==================================================
router.delete("/:id/gallery/:index", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const index = parseInt(req.params.index);

    if (
      isNaN(index) ||
      index < 0 ||
      index >= (user.galleryImages?.length || 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid gallery index",
      });
    }

    const img = user.galleryImages[index];
    if (img) {
      await deleteUserImage(img);
    }

    user.galleryImages.splice(index, 1);
    await user.save();

    return res.json({
      success: true,
      message: "Gallery image deleted",
      galleryImages: user.galleryImages,
    });
  } catch (err) {
    console.error("ADMIN DELETE GALLERY IMAGE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete gallery image",
    });
  }
});

// ==================================================
// DELETE ALL GALLERY IMAGES
// DELETE /admin/users/:id/gallery
// ==================================================
router.delete("/:id/gallery", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.galleryImages && user.galleryImages.length > 0) {
      for (const img of user.galleryImages) {
        await deleteUserImage(img);
      }
    }

    user.galleryImages = [];
    await user.save();

    return res.json({
      success: true,
      message: "All gallery images deleted",
    });
  } catch (err) {
    console.error("ADMIN DELETE ALL GALLERY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete all gallery images",
    });
  }
});

export default router;