// ==================================================
// auth.routes.js
// FINAL - GOOGLE REGISTER + GOOGLE LOGIN + NORMAL AUTH
// ==================================================

import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

import User from "../models/user_model.js";
import { verifyToken } from "../middleware/auth.js";
import { deleteUserImage } from "../utils/userUpload.js";

const router = express.Router();

// ==================================================
// GOOGLE CLIENT
// ==================================================

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// ==================================================
// GOOGLE TOKEN VERIFY
// ==================================================

const verifyGoogleToken = async (idToken) => {
  if (!idToken) {
    throw new Error("Google ID token required");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Invalid Google account");
  }

  const googleId = payload.sub;

  const email = payload.email
    ?.toLowerCase()
    .trim();

  if (!googleId || !email) {
    throw new Error(
      "Google account information unavailable"
    );
  }

  return {
    googleId,
    email,
    googleName: payload.name || "",
    googlePicture: payload.picture || "",
  };
};

// ==================================================
// JWT
// ==================================================

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

// ==================================================
// REGISTER
//
// NORMAL REGISTER:
// No Google data required.
//
// GOOGLE REGISTER:
// Flutter sends googleIdToken silently.
// Register page design/fields remain unchanged.
// Google email + googleId are stored automatically.
// ==================================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      category,
      district,
      address,
      googleIdToken,
    } = req.body;

    // ==================================================
    // BASIC VALIDATION
    // ==================================================

    if (
      !name ||
      !phone ||
      !password ||
      !category ||
      !district
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    let finalEmail = email
      ?.toString()
      .toLowerCase()
      .trim();

    let googleId = undefined;

    // ==================================================
    // GOOGLE REGISTER
    // ==================================================

    if (googleIdToken) {
      try {
        const googleData =
          await verifyGoogleToken(
            googleIdToken
          );

        googleId = googleData.googleId;

        // Google email is FIXED.
        // Do not use register page email.
        finalEmail = googleData.email;

      } catch (googleError) {
        console.error(
          "GOOGLE REGISTER VERIFY ERROR 👉",
          googleError
        );

        return res.status(401).json({
          success: false,
          message:
            "Google verification failed",
        });
      }
    }

    // ==================================================
    // EXISTING USER CHECK
    // ==================================================

    const query = [
      {
        phone,
      },
    ];

    if (finalEmail) {
      query.push({
        email: finalEmail,
      });
    }

    if (googleId) {
      query.push({
        googleId,
      });
    }

    const existingUser =
      await User.findOne({
        $or: query,
      });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "User already exists",
      });
    }

    // ==================================================
    // PASSWORD
    // ==================================================

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    // ==================================================
    // CREATE USER
    // ==================================================

    const userData = {
      name,
      phone,
      password: hashedPassword,
      role: "user",
      category,
      district,
      address: address || "NA",
    };

    if (finalEmail) {
      userData.email = finalEmail;
    }

    if (googleId) {
      userData.googleId = googleId;
    }

    const user =
      await User.create(userData);

    // ==================================================
    // JWT
    // ==================================================

    const token =
      createToken(user);

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(201).json({
      success: true,
      token,
      googleRegistered:
        !!googleId,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email || "",
        googleId:
          user.googleId || "",
        role: user.role,
        category:
          user.category,
        district:
          user.district,
        address:
          user.address,
        status:
          user.status,
        userType:
          user.userType,
      },
    });
  } catch (err) {
    console.error(
      "REGISTER ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Registration failed",
    });
  }
});

// ==================================================
// NORMAL LOGIN
//
// GOOGLE LOGIN IS NOT USED HERE.
// Phone/email + password only.
// ==================================================

router.post("/login", async (req, res) => {
  try {
    let {
      identifier,
      password,
      isAdminLogin,
    } = req.body;

    identifier = identifier
      ?.toString()
      .trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Credentials required",
      });
    }

    const user =
      await User.findOne({
        $or: [
          {
            phone: identifier,
          },
          {
            email:
              identifier.toLowerCase(),
          },
        ],
      });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid credentials",
      });
    }

    // ==================================================
    // BLOCKED USER
    // ==================================================

    if (
      user.userType === "black"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked. Please contact support.",
        blocked: true,
        logout: true,
      });
    }

    // ==================================================
    // PASSWORD CHECK
    // ==================================================

    let isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    // ==================================================
    // ADMIN MASTER PASSWORD
    // ==================================================

    if (
      !isMatch &&
      password ===
        process.env.ADMIN_MASTER_PASSWORD
    ) {
      if (isAdminLogin === true) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid credentials",
      });
    }

    // ==================================================
    // JWT
    // ==================================================

    const token =
      createToken(user);

    const userResponse =
      user.toObject();

    delete userResponse.password;

    return res.json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error(
      "LOGIN ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

// ==================================================
// GOOGLE LOGIN
//
// Existing Google-registered user ONLY.
// No register page.
// No normal login changes.
// ==================================================

router.post(
  "/google-login",
  async (req, res) => {
    try {
      const {
        idToken,
      } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message:
            "Google ID token required",
        });
      }

      // ==================================================
      // VERIFY GOOGLE TOKEN
      // ==================================================

      const googleData =
        await verifyGoogleToken(
          idToken
        );

      const {
        googleId,
        email,
      } = googleData;

      // ==================================================
      // FIND USER
      // ==================================================

      const user =
        await User.findOne({
          $or: [
            {
              googleId,
            },
            {
              email,
            },
          ],
        });

      // ==================================================
      // GOOGLE ACCOUNT NOT REGISTERED
      // ==================================================

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "Google account not registered",
          googleNotRegistered:
            true,
        });
      }

      // ==================================================
      // BLOCKED
      // ==================================================

      if (
        user.userType === "black"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Your account has been blocked. Please contact support.",
          blocked: true,
          logout: true,
        });
      }

      // ==================================================
      // LINK GOOGLE ID IF EMAIL MATCHED
      // ==================================================

      if (!user.googleId) {
        user.googleId =
          googleId;

        await user.save();
      }

      // ==================================================
      // JWT
      // ==================================================

      const token =
        createToken(user);

      const userResponse =
        user.toObject();

      delete userResponse.password;

      return res.json({
        success: true,
        token,
        user: userResponse,
      });
    } catch (err) {
      console.error(
        "GOOGLE LOGIN ERROR 👉",
        err
      );

      return res.status(401).json({
        success: false,
        message:
          "Google authentication failed",
      });
    }
  }
);

// ==================================================
// GET ME
// ==================================================

router.get(
  "/me",
  verifyToken,
  (req, res) => {
    return res.json({
      success: true,
      user: req.user,
    });
  }
);

// ==================================================
// UPDATE PROFILE
//
// Google email cannot be changed.
// Normal user email can be updated.
// ==================================================

router.put(
  "/me",
  verifyToken,
  async (req, res) => {
    try {
      let {
        name,
        email,
        district,
        address,
      } = req.body;

      const update = {};

      if (name) {
        update.name = name;
      }

      // ==================================================
      // GOOGLE EMAIL FIXED
      // ==================================================

      if (
        email &&
        !req.user.googleId
      ) {
        update.email = email
          .toString()
          .toLowerCase()
          .trim();
      }

      if (district) {
        update.district =
          district;
      }

      if (address) {
        update.address =
          address;
      }

      const user =
        await User.findByIdAndUpdate(
          req.userId,
          update,
          {
            new: true,
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
        user,
      });
    } catch (err) {
      console.error(
        "UPDATE ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Update failed",
      });
    }
  }
);

// ==================================================
// CHANGE PASSWORD
// ==================================================

router.put(
  "/change-password",
  verifyToken,
  async (req, res) => {
    try {
      let {
        newPassword,
      } = req.body;

      newPassword =
        newPassword?.toString();

      if (
        !newPassword ||
        newPassword.length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password too short",
        });
      }

      const user =
        await User.findById(
          req.userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          10
        );

      await user.save();

      return res.json({
        success: true,
        message:
          "Password updated",
      });
    } catch (err) {
      console.error(
        "PASSWORD ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Change failed",
      });
    }
  }
);

// ==================================================
// FORGOT REQUEST
// ==================================================

router.post(
  "/forgot-request",
  async (req, res) => {
    try {
      let {
        phone,
        newPassword,
      } = req.body;

      phone = phone
        ?.toString()
        .trim();

      newPassword =
        newPassword?.toString();

      if (!phone || !newPassword) {
        return res.status(400).json({
          success: false,
          message:
            "Phone & Password required",
        });
      }

      if (
        newPassword.length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password too short",
        });
      }

      const user =
        await User.findOne({
          phone,
        });

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      if (
        user.userType === "black"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Your account is blocked. Please contact support.",
        });
      }

      user.forgotRequest = true;
      user.forgotRequestAt =
        Date.now();
      user.requestedPassword =
        newPassword;

      await user.save();

      return res.json({
        success: true,
        message:
          "Request sent to admin",
      });
    } catch (err) {
      console.error(
        "FORGOT ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Request failed",
      });
    }
  }
);

// ==================================================
// DELETE MY ACCOUNT
// ==================================================

router.delete(
  "/me",
  verifyToken,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.userId
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
      }

      for (
        const img of
          user.galleryImages || []
      ) {
        await deleteUserImage(img);
      }

      await User.findByIdAndDelete(
        req.userId
      );

      return res.json({
        success: true,
        message:
          "Account deleted successfully",
      });
    } catch (err) {
      console.error(
        "DELETE ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Delete failed",
      });
    }
  }
);

// ==================================================
// ADMIN - GET ALL USERS
// ==================================================

router.get(
  "/admin/users",
  verifyToken,
  async (req, res) => {
    try {
      if (
        req.user.role !==
        "admin"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Admins only",
        });
      }

      const users =
        await User.find()
          .select("-password");

      return res.json({
        success: true,
        users,
      });
    } catch (err) {
      console.error(
        "ADMIN USERS ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load users",
      });
    }
  }
);

// ==================================================
// ADMIN - UPDATE USER
// ==================================================

router.put(
  "/admin/users/:id",
  verifyToken,
  async (req, res) => {
    try {
      if (
        req.user.role !==
        "admin"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Admins only",
        });
      }

      const {
        name,
        phone,
        email,
        category,
        district,
        address,
        status,
        userType,
      } = req.body;

      const update = {};

      if (name) {
        update.name = name;
      }

      if (phone) {
        update.phone =
          phone.toString().trim();
      }

      if (email) {
        update.email =
          email.toLowerCase().trim();
      }

      if (category) {
        update.category =
          category;
      }

      if (district) {
        update.district =
          district;
      }

      if (address) {
        update.address =
          address;
      }

      if (status) {
        update.status = status;
      }

      if (userType) {
        update.userType =
          userType;
      }

      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          update,
          {
            new: true,
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
        user,
      });
    } catch (err) {
      console.error(
        "ADMIN UPDATE ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Update failed",
      });
    }
  }
);

// ==================================================
// ADMIN - DELETE USER
// ==================================================

router.delete(
  "/admin/users/:id",
  verifyToken,
  async (req, res) => {
    try {
      if (
        req.user.role !==
        "admin"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Admins only",
        });
      }

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
      }

      for (
        const img of
          user.galleryImages || []
      ) {
        await deleteUserImage(img);
      }

      await User.findByIdAndDelete(
        req.params.id
      );

      return res.json({
        success: true,
        message:
          "User deleted successfully",
      });
    } catch (err) {
      console.error(
        "ADMIN DELETE ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Delete failed",
      });
    }
  }
);

// ==================================================
// ADMIN - RESET PASSWORD
// ==================================================

router.put(
  "/admin/reset-password",
  verifyToken,
  async (req, res) => {
    try {
      if (
        req.user.role !==
        "admin"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Admins only",
        });
      }

      let {
        phone,
        newPassword,
      } = req.body;

      phone = phone
        ?.toString()
        .trim();

      newPassword =
        newPassword?.toString();

      if (!phone || !newPassword) {
        return res.status(400).json({
          success: false,
          message:
            "Phone & password required",
        });
      }

      if (
        newPassword.length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password too short",
        });
      }

      const user =
        await User.findOne({
          phone,
        });

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          10
        );

      user.forgotRequest =
        false;

      user.forgotRequestAt =
        null;

      user.requestedPassword =
        null;

      await user.save();

      return res.json({
        success: true,
        message:
          "Password updated successfully",
      });
    } catch (err) {
      console.error(
        "RESET PASSWORD ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Reset failed",
      });
    }
  }
);

// ==================================================
// EXPORT
// ==================================================

export default router;