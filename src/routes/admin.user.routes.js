import express from "express";
import bcrypt from "bcryptjs";

import {
  verifyToken,
  isAdmin,
} from "../middleware/auth.js";

import uploadUser from "../middleware/uploadUser.js";
import User from "../models/user_model.js";

import {
  uploadUserImage,
  deleteUserImage,
} from "../utils/userUpload.js";

const router = express.Router();

// ============================================================
// CONSTANTS
// ============================================================

const ALLOWED_ROLES = [
  "user",
  "admin",
];

const ALLOWED_CATEGORIES = [
  "buyer",
  "seller",
  "driver",
];

const ALLOWED_STATUS = [
  "not_verified",
  "verified",
];

const ALLOWED_VERIFICATION = [
  "verified",
  "mediator",
  "dealer",
  "premium",
  "others",
  "partner",
  "black",
];

const cleanPhone = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return value
    .toString()
    .replace(/\s+/g, "")
    .trim();
};

const cleanEmail = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return value
    .toString()
    .trim()
    .toLowerCase();
};

const cleanText = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return value.toString().trim();
};

// ============================================================
// CREATE USER
// ADMIN ONLY
//
// Required:
// name
// phone
// password
// category
// district
//
// Optional:
// email
// alternatePhone
// address
// status
// verification
// role
// highlightText
// profileImage
// gallery
// ============================================================

router.post(
  "/users",
  verifyToken,
  isAdmin,

  uploadUser.fields([
    {
      name: "profileImage",
      maxCount: 1,
    },
    {
      name: "gallery",
      maxCount: 10,
    },
  ]),

  async (req, res) => {
    try {
      const {
        name,
        phone,
        password,
        category,
        district,
        email,
        alternatePhone,
        address,
        status,
        verification,
        role,
        highlightText,
      } = req.body;

      console.log("========================================");
      console.log("ADMIN CREATE USER");
      console.log("NAME 👉", name);
      console.log("PHONE 👉", phone);
      console.log("STATUS 👉", status);
      console.log("VERIFICATION 👉", verification);
      console.log("ROLE 👉", role);
      console.log("========================================");

      // ========================================================
      // REQUIRED FIELDS
      // ========================================================

      if (
        !cleanText(name) ||
        !cleanPhone(phone) ||
        !cleanText(password) ||
        !cleanText(category) ||
        !cleanText(district)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, phone, password, category and district are required",
        });
      }

      // ========================================================
      // PASSWORD
      // ONLY NUMBER
      // MIN 6 / MAX 10
      // ========================================================

      if (
        !/^\d{6,10}$/.test(
          password.toString()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain only numbers and must be 6 to 10 digits",
        });
      }

      // ========================================================
      // PHONE
      // ========================================================

      const finalPhone = cleanPhone(phone);

      if (!/^\d{10}$/.test(finalPhone)) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number must contain exactly 10 digits",
        });
      }

      const phoneExists = await User.findOne({
        phone: finalPhone,
      });

      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Phone already exists",
        });
      }

      // ========================================================
      // ALTERNATE PHONE
      // OPTIONAL
      // ========================================================

      const finalAlternatePhone =
        cleanPhone(alternatePhone);

      if (
        finalAlternatePhone &&
        !/^\d{10}$/.test(
          finalAlternatePhone
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Alternate phone must contain exactly 10 digits",
        });
      }

      if (
        finalAlternatePhone &&
        finalAlternatePhone === finalPhone
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Alternate phone cannot be same as phone",
        });
      }

      // ========================================================
      // EMAIL
      // OPTIONAL
      // ========================================================

      const finalEmail = cleanEmail(email);

      if (finalEmail) {
        const emailExists = await User.findOne({
          email: finalEmail,
        });

        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      // ========================================================
      // CATEGORY
      // ========================================================

      if (
        !ALLOWED_CATEGORIES.includes(
          category
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      // ========================================================
      // ROLE
      // ========================================================

      const finalRole =
        role || "user";

      if (
        !ALLOWED_ROLES.includes(finalRole)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      // ========================================================
      // STATUS
      // DEFAULT = NOT VERIFIED
      // ADMIN CAN CHOOSE VERIFIED
      // ========================================================

      const finalStatus =
        status || "not_verified";

      if (
        !ALLOWED_STATUS.includes(
          finalStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status",
        });
      }

      // ========================================================
      // VERIFICATION
      // ========================================================

      const finalVerification =
        verification || "others";

      if (
        !ALLOWED_VERIFICATION.includes(
          finalVerification
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid verification",
        });
      }

      // ========================================================
      // HIGHLIGHT
      // OPTIONAL
      // ========================================================

      const finalHighlight =
        cleanText(highlightText);

      if (
        finalHighlight.length > 250
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Highlight cannot exceed 250 characters",
        });
      }

      // ========================================================
      // HASH PASSWORD
      // ========================================================

      const hashedPassword =
        await bcrypt.hash(
          password.toString(),
          10
        );

      // ========================================================
      // CREATE USER
      // ========================================================

      const userData = {
        name: cleanText(name),

        phone: [finalPhone],

        password: hashedPassword,

        category,

        district: cleanText(district),

        address:
          cleanText(address) || "NA",

        role: finalRole,

        verification:
          finalVerification,

        status: finalStatus,

        alternatePhone:
          finalAlternatePhone,

        highlightText:
          finalHighlight,
      };

      // Email only when provided
      if (finalEmail) {
        userData.email = finalEmail;
      }

      const user = new User(userData);

      // ========================================================
      // PROFILE IMAGE
      // ========================================================

      if (
        req.files?.profileImage?.length
      ) {
        user.profileImage =
          await uploadUserImage(
            req.files.profileImage[0],
            "users/profile"
          );
      }

      // ========================================================
      // GALLERY
      // ========================================================

      if (
        req.files?.gallery?.length
      ) {
        user.galleryImages =
          await Promise.all(
            req.files.gallery.map(
              (file) =>
                uploadUserImage(
                  file,
                  "users/gallery"
                )
            )
          );
      }

      await user.save();

      const savedUser =
        await User.findById(
          user._id
        ).select("-password");

      return res.status(201).json({
        success: true,
        message:
          "User created successfully",
        user: savedUser,
      });
    } catch (err) {
      console.error(
        "ADMIN CREATE USER ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to create user",
      });
    }
  }
);

// ============================================================
// GET ALL USERS
// ADMIN ONLY
// ============================================================

router.get(
  "/users",
  verifyToken,
  isAdmin,

  async (req, res) => {
    try {
      const users =
        await User.find({})
          .select("-password")
          .sort({
            createdAt: -1,
          });

      return res.json({
        success: true,
        users,
      });
    } catch (err) {
      console.error(
        "GET ALL USERS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch users",
      });
    }
  }
);

// ============================================================
// GET SINGLE USER
// ADMIN ONLY
// ============================================================

router.get(
  "/users/:id",
  verifyToken,
  isAdmin,

  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
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
        user,
      });
    } catch (err) {
      console.error(
        "GET SINGLE USER ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch user",
      });
    }
  }
);

// ============================================================
// UPDATE USER
// ADMIN ONLY
//
// ALL FIELDS
// ============================================================

router.put(
  "/users/:id",
  verifyToken,
  isAdmin,

  uploadUser.fields([
    {
      name: "profileImage",
      maxCount: 1,
    },
    {
      name: "gallery",
      maxCount: 10,
    },
  ]),

  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const {
        name,
        phone,
        password,
        category,
        district,
        email,
        alternatePhone,
        address,
        status,
        verification,
        role,
        highlightText,
      } = req.body;

      console.log("========================================");
      console.log("ADMIN UPDATE USER");
      console.log("ID 👉", req.params.id);
      console.log("NAME 👉", name);
      console.log("PHONE 👉", phone);
      console.log("STATUS 👉", status);
      console.log("VERIFICATION 👉", verification);
      console.log("ROLE 👉", role);
      console.log("========================================");

      // ========================================================
      // NAME
      // ========================================================

      if (name !== undefined) {
        const value = cleanText(name);

        if (!value) {
          return res.status(400).json({
            success: false,
            message:
              "Name cannot be empty",
          });
        }

        user.name = value;
      }

      // ========================================================
      // PHONE
      // ========================================================

      if (phone !== undefined) {
        const finalPhone =
          cleanPhone(phone);

        if (
          !/^\d{10}$/.test(
            finalPhone
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Phone number must contain exactly 10 digits",
          });
        }

        const phoneExists =
          await User.findOne({
            phone: finalPhone,
            _id: {
              $ne: user._id,
            },
          });

        if (phoneExists) {
          return res.status(400).json({
            success: false,
            message:
              "Phone already exists",
          });
        }

        user.phone = [finalPhone];

        // Alternate phone cannot equal primary
        if (
          user.alternatePhone &&
          user.alternatePhone ===
            finalPhone
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Alternate phone cannot be same as phone",
          });
        }
      }

      // ========================================================
      // ALTERNATE PHONE
      // OPTIONAL
      // EMPTY = REMOVE
      // ========================================================

      if (
        alternatePhone !== undefined
      ) {
        const finalAlternate =
          cleanPhone(
            alternatePhone
          );

        if (
          finalAlternate &&
          !/^\d{10}$/.test(
            finalAlternate
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Alternate phone must contain exactly 10 digits",
          });
        }

        const primaryPhone =
          user.phone?.[0] || "";

        if (
          finalAlternate &&
          finalAlternate ===
            primaryPhone
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Alternate phone cannot be same as phone",
          });
        }

        user.alternatePhone =
          finalAlternate;
      }

      // ========================================================
      // EMAIL
      // OPTIONAL
      // EMPTY = REMOVE
      // ========================================================

      if (email !== undefined) {
        const finalEmail =
          cleanEmail(email);

        if (finalEmail) {
          const emailExists =
            await User.findOne({
              email: finalEmail,
              _id: {
                $ne: user._id,
              },
            });

          if (emailExists) {
            return res.status(400).json({
              success: false,
              message:
                "Email already exists",
            });
          }

          user.email = finalEmail;
        } else {
          user.email = undefined;
        }
      }

      // ========================================================
      // PASSWORD
      // ONLY IF ADMIN ENTERS NEW PASSWORD
      // ========================================================

      if (
        password !== undefined &&
        password.toString().trim() !== ""
      ) {
        if (
          !/^\d{6,10}$/.test(
            password.toString()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Password must contain only numbers and must be 6 to 10 digits",
          });
        }

        user.password =
          await bcrypt.hash(
            password.toString(),
            10
          );
      }

      // ========================================================
      // CATEGORY
      // ========================================================

      if (
        category !== undefined
      ) {
        if (
          !ALLOWED_CATEGORIES.includes(
            category
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid category",
          });
        }

        user.category =
          category;
      }

      // ========================================================
      // DISTRICT
      // ========================================================

      if (
        district !== undefined
      ) {
        const value =
          cleanText(district);

        if (!value) {
          return res.status(400).json({
            success: false,
            message:
              "District cannot be empty",
          });
        }

        user.district = value;
      }

      // ========================================================
      // ADDRESS
      // ========================================================

      if (
        address !== undefined
      ) {
        user.address =
          cleanText(address) ||
          "NA";
      }

      // ========================================================
      // ROLE
      // ========================================================

      if (
        role !== undefined
      ) {
        if (
          !ALLOWED_ROLES.includes(
            role
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid role",
          });
        }

        user.role = role;
      }

      // ========================================================
      // STATUS
      // ADMIN ONLY
      // ========================================================

      if (
        status !== undefined
      ) {
        if (
          !ALLOWED_STATUS.includes(
            status
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid status. Allowed: not_verified, verified",
          });
        }

        user.status = status;
      }

      // ========================================================
      // VERIFICATION
      // ADMIN ONLY
      // ========================================================

      if (
        verification !== undefined
      ) {
        if (
          !ALLOWED_VERIFICATION.includes(
            verification
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid verification",
          });
        }

        user.verification =
          verification;
      }

      // ========================================================
      // HIGHLIGHT
      // ADMIN ONLY
      // EMPTY = REMOVE
      // ========================================================

      if (
        highlightText !== undefined
      ) {
        const value =
          cleanText(highlightText);

        if (
          value.length > 250
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Highlight cannot exceed 250 characters",
          });
        }

        user.highlightText =
          value;
      }

      // ========================================================
      // PROFILE IMAGE
      // ADMIN ONLY
      // ========================================================

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

      // ========================================================
      // EXISTING GALLERY
      //
      // Flutter/Admin can send:
      // existingGallery = JSON.stringify([...])
      //
      // Removed images are deleted from R2
      // ========================================================

      if (
        req.body.existingGallery !==
        undefined
      ) {
        let existingGallery;

        try {
          existingGallery =
            Array.isArray(
              req.body.existingGallery
            )
              ? req.body.existingGallery
              : JSON.parse(
                  req.body.existingGallery
                );
        } catch {
          return res.status(400).json({
            success: false,
            message:
              "Invalid existingGallery format",
          });
        }

        if (
          !Array.isArray(
            existingGallery
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "existingGallery must be an array",
          });
        }

        const imagesToDelete =
          (
            user.galleryImages || []
          ).filter(
            (img) =>
              !existingGallery.includes(
                img
              )
          );

        for (
          const img of
            imagesToDelete
        ) {
          await deleteUserImage(img);
        }

        user.galleryImages =
          existingGallery;
      }

      // ========================================================
      // NEW GALLERY IMAGES
      // ========================================================

      if (
        req.files?.gallery?.length
      ) {
        const newGallery =
          await Promise.all(
            req.files.gallery.map(
              (file) =>
                uploadUserImage(
                  file,
                  "users/gallery"
                )
            )
          );

        user.galleryImages = [
          ...(user.galleryImages ||
            []),
          ...newGallery,
        ];
      }

      await user.save();

      const updatedUser =
        await User.findById(
          user._id
        ).select("-password");

      return res.json({
        success: true,
        message:
          "User updated successfully",
        user: updatedUser,
      });
    } catch (err) {
      console.error(
        "ADMIN UPDATE USER ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to update user",
      });
    }
  }
);

// ============================================================
// CHANGE STATUS
// ADMIN ONLY
// ============================================================

router.patch(
  "/users/:id/status",
  verifyToken,
  isAdmin,

  async (req, res) => {
    try {
      const { status } =
        req.body;

      if (
        !ALLOWED_STATUS.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Allowed: not_verified, verified",
        });
      }

      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          {
            status,
          },
          {
            new: true,
            runValidators: true,
          }
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
        message:
          "Status updated successfully",
        status: user.status,
        user,
      });
    } catch (err) {
      console.error(
        "ADMIN STATUS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update status",
      });
    }
  }
);

// ============================================================
// CHANGE VERIFICATION
// ADMIN ONLY
// ============================================================

router.patch(
  "/users/:id/verification",
  verifyToken,
  isAdmin,

  async (req, res) => {
    try {
      const {
        verification,
      } = req.body;

      if (
        !ALLOWED_VERIFICATION.includes(
          verification
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid verification",
        });
      }

      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          {
            verification,
          },
          {
            new: true,
            runValidators: true,
          }
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
        message:
          "Verification updated successfully",
        verification:
          user.verification,
        user,
      });
    } catch (err) {
      console.error(
        "ADMIN VERIFICATION ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update verification",
      });
    }
  }
);

// ============================================================
// CHANGE HIGHLIGHT
// ADMIN ONLY
// ============================================================

router.patch(
  "/users/:id/highlight",
  verifyToken,
  isAdmin,

  async (req, res) => {
    try {
      const value =
        cleanText(
          req.body.highlightText
        );

      if (
        value.length > 250
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Highlight cannot exceed 250 characters",
        });
      }

      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          {
            highlightText: value,
          },
          {
            new: true,
            runValidators: true,
          }
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
        message:
          value
            ? "Highlight updated successfully"
            : "Highlight removed successfully",

        highlightText:
          user.highlightText || "",

        user,
      });
    } catch (err) {
      console.error(
        "ADMIN HIGHLIGHT ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update highlight",
      });
    }
  }
);

// ============================================================
// CHANGE ALTERNATE PHONE
// ADMIN ONLY
// ============================================================

router.patch(
  "/users/:id/alternate-phone",
  verifyToken,
  isAdmin,

  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const value =
        cleanPhone(
          req.body.alternatePhone
        );

      if (
        value &&
        !/^\d{10}$/.test(value)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Alternate phone must contain exactly 10 digits",
        });
      }

      const primaryPhone =
        user.phone?.[0] || "";

      if (
        value &&
        value === primaryPhone
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Alternate phone cannot be same as phone",
        });
      }

      user.alternatePhone =
        value;

      await user.save();

      const updatedUser =
        await User.findById(
          user._id
        ).select("-password");

      return res.json({
        success: true,
        message:
          value
            ? "Alternate phone updated successfully"
            : "Alternate phone removed successfully",

        alternatePhone:
          updatedUser.alternatePhone ||
          "",

        user: updatedUser,
      });
    } catch (err) {
      console.error(
        "ADMIN ALTERNATE PHONE ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update alternate phone",
      });
    }
  }
);

// ============================================================
// CHANGE ROLE
// ADMIN ONLY
// ============================================================

router.patch(
  "/users/:id/role",
  verifyToken,
  isAdmin,

  async (req, res) => {
    try {
      const { role } =
        req.body;

      if (
        !ALLOWED_ROLES.includes(
          role
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid role",
        });
      }

      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          {
            role,
          },
          {
            new: true,
            runValidators: true,
          }
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
        message:
          "Role updated successfully",
        role: user.role,
        user,
      });
    } catch (err) {
      console.error(
        "ADMIN ROLE ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update role",
      });
    }
  }
);

// ============================================================
// DELETE PROFILE IMAGE
// ADMIN ONLY
// ============================================================

router.delete(
  "/users/:id/profile-image",
  verifyToken,
  isAdmin,

  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
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
        "ADMIN DELETE PROFILE ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete profile image",
      });
    }
  }
);

// ============================================================
// DELETE SINGLE GALLERY IMAGE
// ADMIN ONLY
// ============================================================

router.delete(
  "/users/:id/gallery/:index",
  verifyToken,
  isAdmin,

  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const index =
        Number(req.params.index);

      const gallery =
        user.galleryImages || [];

      if (
        Number.isNaN(index) ||
        index < 0 ||
        index >= gallery.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid gallery index",
        });
      }

      const image =
        gallery[index];

      await deleteUserImage(image);

      gallery.splice(index, 1);

      user.galleryImages =
        gallery;

      await user.save();

      return res.json({
        success: true,
        message:
          "Gallery image deleted",
        galleryImages:
          user.galleryImages,
      });
    } catch (err) {
      console.error(
        "ADMIN DELETE GALLERY ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete gallery image",
      });
    }
  }
);

// ============================================================
// DELETE ALL GALLERY
// ADMIN ONLY
// ============================================================

router.delete(
  "/users/:id/gallery",
  verifyToken,
  isAdmin,

  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const gallery =
        user.galleryImages || [];

      for (
        const image of gallery
      ) {
        await deleteUserImage(
          image
        );
      }

      user.galleryImages = [];

      await user.save();

      return res.json({
        success: true,
        message:
          "All gallery images deleted",
        galleryImages: [],
      });
    } catch (err) {
      console.error(
        "ADMIN DELETE ALL GALLERY ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete gallery",
      });
    }
  }
);

// ============================================================
// DELETE USER
// ADMIN ONLY
//
// Deletes:
// - MongoDB user
// - Profile image
// - All gallery images
// ============================================================

router.delete(
  "/users/:id",
  verifyToken,
  isAdmin,

  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      // Delete profile image
      if (user.profileImage) {
        await deleteUserImage(
          user.profileImage
        );
      }

      // Delete gallery images
      for (
        const image of
          user.galleryImages || []
      ) {
        await deleteUserImage(
          image
        );
      }

      await User.findByIdAndDelete(
        user._id
      );

      return res.json({
        success: true,
        message:
          "User and all images deleted successfully",
      });
    } catch (err) {
      console.error(
        "ADMIN DELETE USER ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete user",
      });
    }
  }
);

export default router;