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
    throw new Error(
      "Google ID token required"
    );
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
// PHONE
// STRING ONLY
// EXACTLY 10 DIGITS
// ==================================================

const cleanPhone = (phone) => {
  return phone
    ?.toString()
    .replace(/\s+/g, "")
    .trim();
};

const isValidPhone = (phone) => {
  return /^[0-9]{10}$/.test(
    cleanPhone(phone) || ""
  );
};

// ==================================================
// REGISTER
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
      // PHONE = STRING
      // EXACTLY 10 DIGITS
      // ==================================================

      const finalPhone =
        cleanPhone(phone);

      if (!isValidPhone(finalPhone)) {
        return res.status(400).json({
          success: false,
          message:
            "Phone must contain exactly 10 digits",
        });
      }

      // ==================================================
      // PASSWORD
      // ==================================================

      if (
        !/^[0-9]{6,10}$/.test(
          password.toString().trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be 6-10 numbers",
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
          phone: finalPhone,
        },
      ];

      if (finalEmail) {
        orConditions.push({
          email: finalEmail,
        });
      }

      if (googleId) {
        orConditions.push({
          googleId,
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
          password
            .toString()
            .trim(),
          10
        );

      // ==================================================
      // USER DATA
      // ==================================================

      const userData = {
        name:
          name.toString().trim(),

        // PHONE = STRING
        phone:
          finalPhone,

        password:
          hashedPassword,

        role: "user",

        category:
          category.toString().trim(),

        district:
          district.toString().trim(),

        address:
          address || "NA",
      };

      if (finalEmail) {
        userData.email =
          finalEmail;
      }

      if (googleId) {
        userData.googleId =
          googleId;

        userData.googleName =
          googleName;

        userData.googleProfileImage =
          googleProfileImage;
      }

      const user =
        await User.create(
          userData
        );

      const token =
        createToken(user);

      const responseUser =
        user.toObject();

      delete responseUser.password;

      return res.status(201).json({
        success: true,
        token,

        googleRegistered:
          !!googleId,

        user:
          responseUser,
      });
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Duplicate email, Google account or phone",
        });
      }

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

      let phoneIdentifier =
        identifier;

      if (
        /^[0-9]+$/.test(
          identifier
        )
      ) {
        phoneIdentifier =
          cleanPhone(identifier);
      }

      const user =
        await User.findOne({
          $or: [
            {
              phone:
                phoneIdentifier,
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
          password.toString(),
          user.password
        );

      // ==================================================
      // ADMIN MASTER PASSWORD
      // ==================================================

      if (
        !isMatch &&
        password ===
          process.env
            .ADMIN_MASTER_PASSWORD &&
        isAdminLogin === true
      ) {
        isMatch = true;
      }

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid credentials",
        });
      }

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

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "Google account not registered",
          googleNotRegistered:
            true,
          google: {
            googleId,
            googleName,
            email,
            googleProfileImage,
          },
        });
      }

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
// FORGOT PASSWORD REQUEST
//
// POST /api/auth/forgot-request
//
// PHONE = STRING
// EXACTLY 10 DIGITS
//
// PASSWORD = NUMBERS ONLY
// MIN 6 / MAX 10
//
// IMPORTANT:
// This creates a forgot request.
// It does NOT directly change the password.
// ==================================================

router.post(
  "/forgot-request",
  async (req, res) => {
    try {
      let {
        phone,
        newPassword,
      } = req.body;

      // ==================================================
      // CLEAN PHONE
      // ==================================================

      phone =
        phone
          ?.toString()
          .replace(/\s+/g, "")
          .trim();

      // ==================================================
      // CLEAN PASSWORD
      // ==================================================

      newPassword =
        newPassword
          ?.toString()
          .trim();

      // ==================================================
      // PHONE VALIDATION
      // ==================================================

      if (
        !phone ||
        !/^[0-9]{10}$/.test(
          phone
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Phone must contain exactly 10 digits",
        });
      }

      // ==================================================
      // PASSWORD VALIDATION
      // ==================================================

      if (
        !newPassword ||
        !/^[0-9]{6,10}$/.test(
          newPassword
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be 6-10 numbers",
        });
      }

      console.log(
        "FORGOT REQUEST PHONE:",
        phone
      );

      // ==================================================
      // FIND USER
      //
      // PHONE IS STRING
      // ==================================================

      const user =
        await User.findOne({
          phone: phone,
        });

      // ==================================================
      // USER NOT FOUND
      // ==================================================

      if (!user) {
        console.log(
          "FORGOT REQUEST USER NOT FOUND:",
          phone
        );

        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      // ==================================================
      // BLOCKED USER
      // ==================================================

      if (
        user.userType ===
        "black"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Your account has been blocked",
          blocked: true,
        });
      }

      // ==================================================
      // SAVE FORGOT REQUEST
      // ==================================================

      user.forgotRequest =
        true;

      user.forgotRequestAt =
        new Date();

      user.requestedPassword =
        newPassword;

      await user.save();

      console.log(
        "FORGOT REQUEST SAVED:",
        user._id.toString()
      );

      // ==================================================
      // SUCCESS
      // ==================================================

      return res.status(200).json({
        success: true,
        message:
          "Password reset request submitted successfully",
      });
    } catch (error) {
      console.error(
        "FORGOT REQUEST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to submit password reset request",
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

          name:
            user.name,

          googleName:
            user.googleName ||
            "",

          email:
            user.email || "",

          googleId:
            user.googleId ||
            "",

          googleProfileImage:
            user.googleProfileImage ||
            "",

          // PHONE = STRING
          phone:
            user.phone || "",

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

          profileImage:
            user.profileImage ||
            "",

          // GALLERY = ARRAY
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