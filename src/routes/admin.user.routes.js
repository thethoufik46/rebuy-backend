import express from "express";
import bcrypt from "bcryptjs";

import User from "../models/user_model.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// ============================================================
// ADMIN AUTH
// ============================================================

const verifyAdmin = async (req, res, next) => {
  try {
    await verifyToken(req, res, async () => {
      const user = await User.findById(
        req.user.id
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Admin user not found",
        });
      }

      if (user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      req.admin = user;
      next();
    });
  } catch (error) {
    console.error(
      "ADMIN AUTH ERROR:",
      error
    );

    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};

// ============================================================
// VALIDATION HELPERS
// ============================================================

const validRoles = [
  "user",
  "admin",
];

const validCategories = [
  "buyer",
  "seller",
  "driver",
];

const validUserTypes = [
  "verified",
  "mediator",
  "dealer",
  "premium",
  "others",
  "partner",
  "black",
];

const validStatuses = [
  "not_verified",
  "verified",
];

const clean = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return value
    .toString()
    .trim();
};

// ============================================================
// PHONE VALIDATION
// SINGLE STRING
// EXACTLY 10 DIGITS
// ============================================================

const validatePhone = (phone) => {
  const value = clean(phone);

  return /^[0-9]{10}$/.test(value);
};

// ============================================================
// ALTERNATE PHONE VALIDATION
// ============================================================

const validateAlternatePhone = (
  alternatePhone
) => {
  const value = clean(
    alternatePhone
  );

  if (value === "") {
    return {
      valid: true,
      value: "",
    };
  }

  if (
    !/^[0-9]{10}$/.test(value)
  ) {
    return {
      valid: false,
      value,
    };
  }

  return {
    valid: true,
    value,
  };
};

// ============================================================
// ADMIN GET ALL USERS
// ============================================================

router.get(
  "/users",
  verifyAdmin,
  async (req, res) => {
    try {
      const users = await User.find()
        .select("-password")
        .sort({
          createdAt: -1,
        });

      return res.json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error) {
      console.error(
        "ADMIN GET USERS ERROR:",
        error
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
// ADMIN GET SINGLE USER
// ============================================================

router.get(
  "/users/:id",
  verifyAdmin,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
        ).select("-password");

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
    } catch (error) {
      console.error(
        "ADMIN GET USER ERROR:",
        error
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
// ADMIN CREATE USER
//
// PHONE:
// ✅ String
// ✅ Exactly 10 digits
//
// GALLERY:
// ✅ Array
// ============================================================

router.post(
  "/users",
  verifyAdmin,
  async (req, res) => {
    try {
      let {
        name,
        googleName,
        email,
        googleId,
        googleProfileImage,
        phone,
        alternatePhone,
        password,
        role,
        category,
        userType,
        status,
        highlightText,
        district,
        address,
        profileImage,
        galleryImages,
      } = req.body;

      // ========================================================
      // CLEAN
      // ========================================================

      name = clean(name);

      googleName =
        clean(googleName);

      email =
        clean(email).toLowerCase();

      googleId =
        clean(googleId);

      googleProfileImage =
        clean(googleProfileImage);

      // PHONE = STRING
      phone = clean(phone);

      alternatePhone =
        clean(alternatePhone);

      password =
        clean(password);

      role =
        clean(role) || "user";

      category =
        clean(category);

      userType =
        clean(userType) || "others";

      status =
        clean(status) ||
        "not_verified";

      highlightText =
        clean(highlightText);

      district =
        clean(district);

      address =
        clean(address) || "NA";

      profileImage =
        clean(profileImage);

      // ========================================================
      // REQUIRED
      // ========================================================

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Name is required",
        });
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          message:
            "Password is required",
        });
      }

      if (!category) {
        return res.status(400).json({
          success: false,
          message:
            "Category is required",
        });
      }

      if (!district) {
        return res.status(400).json({
          success: false,
          message:
            "District is required",
        });
      }

      // ========================================================
      // PHONE
      // SINGLE STRING
      // EXACTLY 10 DIGITS
      // ========================================================

      if (!validatePhone(phone)) {
        return res.status(400).json({
          success: false,
          message:
            "Phone must contain exactly 10 digits",
        });
      }

      // ========================================================
      // ALTERNATE PHONE
      // ========================================================

      const alternateValidation =
        validateAlternatePhone(
          alternatePhone
        );

      if (
        !alternateValidation.valid
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Alternate phone must contain 10 digits",
        });
      }

      alternatePhone =
        alternateValidation.value;

      // ========================================================
      // ENUM VALIDATION
      // ========================================================

      if (
        !validRoles.includes(role)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      if (
        !validCategories.includes(
          category
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid category",
        });
      }

      if (
        !validUserTypes.includes(
          userType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user type",
        });
      }

      if (
        !validStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status",
        });
      }

      // ========================================================
      // CHECK EMAIL
      // ========================================================

      if (email) {
        const existingEmail =
          await User.findOne({
            email,
          });

        if (existingEmail) {
          return res.status(409).json({
            success: false,
            message:
              "Email already exists",
          });
        }
      }

      // ========================================================
      // CHECK GOOGLE ID
      // ========================================================

      if (googleId) {
        const existingGoogle =
          await User.findOne({
            googleId,
          });

        if (existingGoogle) {
          return res.status(409).json({
            success: false,
            message:
              "Google account already exists",
          });
        }
      }

      // ========================================================
      // HASH PASSWORD
      // ========================================================

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      // ========================================================
      // GALLERY
      // ARRAY ONLY
      // ========================================================

      const cleanGallery =
        Array.isArray(
          galleryImages
        )
          ? galleryImages
              .map((item) =>
                clean(item)
              )
              .filter(
                (item) =>
                  item.length > 0
              )
          : [];

      // ========================================================
      // CREATE USER
      // ========================================================

      const user =
        new User({
          name,

          googleName,

          email:
            email || undefined,

          googleId:
            googleId || undefined,

          googleProfileImage,

          // PHONE = STRING
          phone,

          alternatePhone,

          password:
            hashedPassword,

          role,

          category,

          userType,

          status,

          highlightText,

          district,

          address,

          profileImage,

          // GALLERY = ARRAY
          galleryImages:
            cleanGallery,
        });

      await user.save();

      // ========================================================
      // RESPONSE
      // ========================================================

      const responseUser =
        user.toObject();

      delete responseUser.password;

      return res.status(201).json({
        success: true,
        message:
          "User created successfully",
        user: responseUser,
      });
    } catch (error) {
      console.error(
        "ADMIN CREATE USER ERROR:",
        error
      );

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Duplicate email or Google account",
        });
      }

      if (
        error?.message ===
        "Invalid district"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid district",
        });
      }

      if (
        error?.message ===
        "District is required"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "District is required",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to create user",
      });
    }
  }
);

// ============================================================
// ADMIN UPDATE USER
//
// PHONE:
// ✅ String
// ✅ Exactly 10 digits
//
// GALLERY:
// ✅ Array
// ============================================================

router.put(
  "/users/:id",
  verifyAdmin,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // ========================================================
      // BASIC
      // ========================================================

      if (
        req.body.name !== undefined
      ) {
        const name =
          clean(
            req.body.name
          );

        if (!name) {
          return res.status(400).json({
            success: false,
            message:
              "Name is required",
          });
        }

        user.name = name;
      }

      // ========================================================
      // GOOGLE NAME
      // ========================================================

      if (
        req.body.googleName !==
        undefined
      ) {
        user.googleName =
          clean(
            req.body.googleName
          );
      }

      // ========================================================
      // EMAIL
      // ========================================================

      if (
        req.body.email !==
        undefined
      ) {
        const email =
          clean(
            req.body.email
          ).toLowerCase();

        if (email) {
          const duplicate =
            await User.findOne({
              email,
              _id: {
                $ne: user._id,
              },
            });

          if (duplicate) {
            return res.status(409).json({
              success: false,
              message:
                "Email already exists",
            });
          }

          user.email = email;
        } else {
          user.email =
            undefined;
        }
      }

      // ========================================================
      // GOOGLE ID
      // ========================================================

      if (
        req.body.googleId !==
        undefined
      ) {
        const googleId =
          clean(
            req.body.googleId
          );

        if (googleId) {
          const duplicate =
            await User.findOne({
              googleId,
              _id: {
                $ne: user._id,
              },
            });

          if (duplicate) {
            return res.status(409).json({
              success: false,
              message:
                "Google account already exists",
            });
          }

          user.googleId =
            googleId;
        } else {
          user.googleId =
            undefined;
        }
      }

      // ========================================================
      // GOOGLE PROFILE IMAGE
      // ========================================================

      if (
        req.body.googleProfileImage !==
        undefined
      ) {
        user.googleProfileImage =
          clean(
            req.body
              .googleProfileImage
          );
      }

      // ========================================================
      // PHONE
      // SINGLE STRING
      // EXACTLY 10 DIGITS
      // ========================================================

      if (
        req.body.phone !==
        undefined
      ) {
        const phone =
          clean(
            req.body.phone
          );

        if (
          !validatePhone(phone)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Phone must contain exactly 10 digits",
          });
        }

        user.phone = phone;
      }

      // ========================================================
      // ALTERNATE PHONE
      // ========================================================

      if (
        req.body.alternatePhone !==
        undefined
      ) {
        const validation =
          validateAlternatePhone(
            req.body
              .alternatePhone
          );

        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message:
              "Alternate phone must contain 10 digits",
          });
        }

        user.alternatePhone =
          validation.value;
      }

      // ========================================================
      // PASSWORD
      // ========================================================

      if (
        req.body.password !==
        undefined
      ) {
        const password =
          clean(
            req.body.password
          );

        if (password) {
          user.password =
            await bcrypt.hash(
              password,
              10
            );
        }
      }

      // ========================================================
      // ROLE
      // ========================================================

      if (
        req.body.role !==
        undefined
      ) {
        const role =
          clean(
            req.body.role
          );

        if (
          !validRoles.includes(
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
      // CATEGORY
      // ========================================================

      if (
        req.body.category !==
        undefined
      ) {
        const category =
          clean(
            req.body.category
          );

        if (
          !validCategories.includes(
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
      // USER TYPE
      // ========================================================

      if (
        req.body.userType !==
        undefined
      ) {
        const userType =
          clean(
            req.body.userType
          );

        if (
          !validUserTypes.includes(
            userType
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid user type",
          });
        }

        user.userType =
          userType;
      }

      // ========================================================
      // STATUS
      // ========================================================

      if (
        req.body.status !==
        undefined
      ) {
        const status =
          clean(
            req.body.status
          );

        if (
          !validStatuses.includes(
            status
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid status",
          });
        }

        user.status =
          status;
      }

      // ========================================================
      // HIGHLIGHT
      // ========================================================

      if (
        req.body.highlightText !==
        undefined
      ) {
        const highlightText =
          clean(
            req.body.highlightText
          );

        if (
          highlightText.length >
          250
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Highlight text cannot exceed 250 characters",
          });
        }

        user.highlightText =
          highlightText;
      }

      // ========================================================
      // DISTRICT
      // ========================================================

      if (
        req.body.district !==
        undefined
      ) {
        const district =
          clean(
            req.body.district
          );

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

      // ========================================================
      // ADDRESS
      // ========================================================

      if (
        req.body.address !==
        undefined
      ) {
        user.address =
          clean(
            req.body.address
          ) || "NA";
      }

      // ========================================================
      // PROFILE IMAGE
      // ========================================================

      if (
        req.body.profileImage !==
        undefined
      ) {
        user.profileImage =
          clean(
            req.body.profileImage
          );
      }

      // ========================================================
      // GALLERY
      // ARRAY ONLY
      // ========================================================

      if (
        req.body.galleryImages !==
        undefined
      ) {
        if (
          !Array.isArray(
            req.body.galleryImages
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "galleryImages must be an array",
          });
        }

        user.galleryImages =
          req.body.galleryImages
            .map((item) =>
              clean(item)
            )
            .filter(
              (item) =>
                item.length > 0
            );
      }

      // ========================================================
      // SAVE
      // ========================================================

      await user.save();

      // ========================================================
      // RESPONSE
      // ========================================================

      const responseUser =
        user.toObject();

      delete responseUser.password;

      return res.json({
        success: true,
        message:
          "User updated successfully",
        user: responseUser,
      });
    } catch (error) {
      console.error(
        "ADMIN UPDATE USER ERROR:",
        error
      );

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Duplicate email or Google account",
        });
      }

      if (
        error?.message ===
        "Invalid district"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid district",
        });
      }

      if (
        error?.message ===
        "District is required"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "District is required",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to update user",
      });
    }
  }
);

// ============================================================
// ADMIN DELETE USER
// ============================================================

router.delete(
  "/users/:id",
  verifyAdmin,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Prevent admin from deleting
      // the currently logged-in admin.
      if (
        user._id.toString() ===
        req.admin._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot delete your own admin account",
        });
      }

      await User.findByIdAndDelete(
        req.params.id
      );

      return res.json({
        success: true,
        message:
          "User deleted successfully",
      });
    } catch (error) {
      console.error(
        "ADMIN DELETE USER ERROR:",
        error
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