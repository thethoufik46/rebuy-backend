import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

import User from "../models/user_model.js";
import { verifyToken } from "../middleware/auth.js";

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

  const ticket =
    await googleClient.verifyIdToken({
      idToken,
      audience:
        process.env.GOOGLE_CLIENT_ID,
    });

  const payload =
    ticket.getPayload();

  if (!payload) {
    throw new Error(
      "Invalid Google account"
    );
  }

  const googleId =
    payload.sub;

  const email =
    payload.email
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
    googleName:
      payload.name || "",
    googleProfileImage:
      payload.picture || "",
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
// NORMAL REGISTER
// --------------------------------------------------
// name          = Register page name
//
// GOOGLE REGISTER
// --------------------------------------------------
// name                = Register page name
// googleName          = Google account name
// email               = Google Gmail
// googleId             = Google account ID
// googleProfileImage   = Google profile image
// ==================================================

router.post(
  "/register",
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
        googleIdToken,
      } = req.body;

      // ==================================================
      // REQUIRED FIELDS
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
          message:
            "Required fields missing",
        });
      }

      // ==================================================
      // GOOGLE DATA
      // ==================================================

      let finalEmail =
        email
          ?.toString()
          .toLowerCase()
          .trim();

      let googleId = "";
      let googleName = "";
      let googleProfileImage = "";

      // ==================================================
      // GOOGLE REGISTER
      // ==================================================

      if (googleIdToken) {
        try {
          const googleData =
            await verifyGoogleToken(
              googleIdToken
            );

          googleId =
            googleData.googleId;

          googleName =
            googleData.googleName;

          googleProfileImage =
            googleData.googleProfileImage;

          // Google Gmail is FIXED.
          // Register page email is ignored.
          finalEmail =
            googleData.email;
        } catch (error) {
          console.error(
            "GOOGLE REGISTER VERIFY ERROR:",
            error
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

      const orConditions = [
        {
          phone: phone,
        },
      ];

      if (finalEmail) {
        orConditions.push({
          email: finalEmail,
        });
      }

      if (googleId) {
        orConditions.push({
          googleId: googleId,
        });
      }

      const existingUser =
        await User.findOne({
          $or: orConditions,
        });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message:
            "User already exists",
        });
      }

      // ==================================================
      // PASSWORD HASH
      // ==================================================

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      // ==================================================
      // USER DATA
      // ==================================================

      const userData = {
        // Register page name
        name: name,

        phone: phone,

        password:
          hashedPassword,

        role: "user",

        category:
          category,

        district:
          district,

        address:
          address || "NA",
      };

      // ==================================================
      // NORMAL EMAIL
      // ==================================================

      if (finalEmail) {
        userData.email =
          finalEmail;
      }

      // ==================================================
      // GOOGLE DATA
      // ==================================================

      if (googleId) {
        userData.googleId =
          googleId;

        userData.googleName =
          googleName;

        userData.googleProfileImage =
          googleProfileImage;
      }

      // ==================================================
      // CREATE USER
      // ==================================================

      const user =
        await User.create(
          userData
        );

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
          _id:
            user._id,

          // Register name
          name:
            user.name,

          phone:
            user.phone,

          // Google Gmail
          email:
            user.email || "",

          // Google ID
          googleId:
            user.googleId || "",

          // Google name
          googleName:
            user.googleName || "",

          // Google profile image
          googleProfileImage:
            user.googleProfileImage ||
            "",

          role:
            user.role,

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
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Registration failed",
      });
    }
  }
);

// ==================================================
// NORMAL LOGIN
//
// Google login NOT used here.
// Phone/email + password only.
// ==================================================

router.post(
  "/login",
  async (req, res) => {
    try {
      let {
        identifier,
        password,
        isAdminLogin,
      } = req.body;

      identifier =
        identifier
          ?.toString()
          .trim();

      if (
        !identifier ||
        !password
      ) {
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
              phone:
                identifier,
            },
            {
              email:
                identifier
                  .toLowerCase(),
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
      // BLOCKED
      // ==================================================

      if (
        user.userType ===
        "black"
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
      // PASSWORD
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
          process.env
            .ADMIN_MASTER_PASSWORD
      ) {
        if (
          isAdminLogin === true
        ) {
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
        user:
          userResponse,
      });
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Login failed",
      });
    }
  }
);

// ==================================================
// GOOGLE LOGIN
//
// Existing Google account -> HOME
//
// If Google account is not registered,
// Flutter should open REGISTER page.
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
      // VERIFY GOOGLE
      // ==================================================

      const googleData =
        await verifyGoogleToken(
          idToken
        );

      const {
        googleId,
        email,
        googleName,
        googleProfileImage,
      } = googleData;

      // ==================================================
      // FIND EXISTING USER
      // ==================================================

      const user =
        await User.findOne({
          $or: [
            {
              googleId:
                googleId,
            },
            {
              email:
                email,
            },
          ],
        });

      // ==================================================
      // NOT REGISTERED
      // ==================================================

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "Google account not registered",
          googleNotRegistered:
            true,

          // Send Google data to Flutter
          // so Register page can use it.
          google: {
            googleId:
              googleId,

            googleName:
              googleName,

            email:
              email,

            googleProfileImage:
              googleProfileImage,
          },
        });
      }

      // ==================================================
      // BLOCKED
      // ==================================================

      if (
        user.userType ===
        "black"
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
      // UPDATE GOOGLE DATA
      //
      // Google fields only.
      //
      // IMPORTANT:
      // user.name is NEVER replaced.
      // user.profileImage is NEVER replaced.
      // ==================================================

      let changed = false;

      if (
        user.googleId !==
        googleId
      ) {
        user.googleId =
          googleId;

        changed = true;
      }

      if (
        user.googleName !==
        googleName
      ) {
        user.googleName =
          googleName || "";

        changed = true;
      }

      if (
        user.email !==
        email
      ) {
        user.email =
          email;

        changed = true;
      }

      if (
        user.googleProfileImage !==
        googleProfileImage
      ) {
        user.googleProfileImage =
          googleProfileImage ||
          "";

        changed = true;
      }

      if (changed) {
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
        user:
          userResponse,
      });
    } catch (error) {
      console.error(
        "GOOGLE LOGIN ERROR:",
        error
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
// GET MY PROFILE
// ==================================================

router.get(
  "/me",
  verifyToken,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.userId
        ).select(
          "-password"
        );

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
          _id:
            user._id,

          // Re2Buy name
          name:
            user.name,

          // Google account name
          googleName:
            user.googleName ||
            "",

          // Gmail
          email:
            user.email || "",

          // Google ID
          googleId:
            user.googleId ||
            "",

          // Google profile
          googleProfileImage:
            user.googleProfileImage ||
            "",

          phone:
            user.phone,

          alternatePhone:
            user.alternatePhone ||
            "",

          category:
            user.category,

          district:
            user.district,

          address:
            user.address ||
            "NA",

          role:
            user.role,

          status:
            user.status ||
            "not_verified",

          userType:
            user.userType ||
            "others",

          highlightText:
            user.highlightText ||
            "",

          // Re2Buy profile image
          profileImage:
            user.profileImage ||
            "",

          galleryImages:
            user.galleryImages ||
            [],

          createdAt:
            user.createdAt,

          updatedAt:
            user.updatedAt,
        },
      });
    } catch (error) {
      console.error(
        "GET PROFILE ERROR:",
        error
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
// EXPORT
// ==================================================

export default router;