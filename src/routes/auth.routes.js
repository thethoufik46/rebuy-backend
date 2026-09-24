import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user/user_model.js";
import { verifyToken } from "../middleware/auth.js";
import { sendOtpEmail } from "../utils/sendEmail.js";

const router = express.Router();

// ==================================================
// CONFIG
// ==================================================
const MAX_LOGIN_ATTEMPTS = 3;
const LOCK_DURATION_MS = 5 * 60 * 1000;
const ACCESS_EXPIRY = "15m";
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_REFRESH_TOKENS = 5;

// ==================================================
// VALID LANGUAGE CODES
// ==================================================
const validLanguages = ["en","ta","ml","te","hi","kn","bn","mr","gu","ur","or"];
const isValidLanguage = (language) => {
  if (!language) return true;
  return validLanguages.includes(language.toString().trim());
};

// ==================================================
// GOOGLE CLIENT
// ==================================================
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (idToken) => {
  if (!idToken) throw new Error("Google ID token required");
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google account");

  const googleId = payload.sub;
  const email = payload.email?.toLowerCase().trim();
  if (!googleId || !email) throw new Error("Google account information unavailable");

  return {
    googleId,
    email,
    googleName: payload.name || "",
    googleProfileImage: payload.picture || "",
  };
};

// ==================================================
// TOKEN HELPERS
// ==================================================
const createAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );

const createRefreshToken = () => crypto.randomBytes(48).toString("hex");

const saveRefreshToken = async (user, device = "") => {
  const token = createRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);

  // Remove expired tokens
  user.refreshTokens = (user.refreshTokens || []).filter(
    (t) => t.expiresAt > new Date()
  );

  // Limit active devices (FIFO)
  if (user.refreshTokens.length >= MAX_REFRESH_TOKENS) {
    user.refreshTokens.shift();
  }

  user.refreshTokens.push({
    token,
    expiresAt,
    device: device.toString().slice(0, 200),
    createdAt: new Date(),
  });

  await user.save();
  return token;
};

const buildAuthResponse = async (user, device = "") => {
  const token = createAccessToken(user);
  const refreshToken = await saveRefreshToken(user, device);

  const responseUser = user.toObject();
  delete responseUser.password;
  delete responseUser.refreshTokens;
  delete responseUser.loginAttempts;
  delete responseUser.lockUntil;
  delete responseUser.resetOtp;
  delete responseUser.resetOtpExpiry;
  delete responseUser.resetOtpAttempts;

  return { token, refreshToken, user: responseUser };
};

// ==================================================
// PHONE HELPERS
// ==================================================
const cleanPhone = (phone) =>
  phone?.toString().replace(/\s+/g, "").trim();

const isValidPhone = (phone) =>
  /^[0-9]{10}$/.test(cleanPhone(phone) || "");

// ==================================================
// LOCK HELPERS
// ==================================================
const isLocked = (user) =>
  user.lockUntil && user.lockUntil > new Date();

const getRemainingLockMinutes = (user) => {
  if (!user.lockUntil) return 0;
  return Math.ceil((user.lockUntil - new Date()) / 60000);
};

// ==================================================
// REGISTER
// ==================================================
router.post("/register", async (req, res) => {
  try {
    const {
      name, phone, email, password,
      category, district, address,
      language, googleIdToken,
    } = req.body;

    if (!name || !phone || !password || !category || !district) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const finalLanguage = language?.toString().trim() || "en";
    if (!isValidLanguage(finalLanguage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid language",
        validLanguages,
      });
    }

    const finalPhone = cleanPhone(phone);
    if (!isValidPhone(finalPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone must contain exactly 10 digits",
      });
    }

    if (!/^[0-9]{6,10}$/.test(password.toString().trim())) {
      return res.status(400).json({
        success: false,
        message: "Password must be 6-10 numbers",
      });
    }

    let finalEmail = email?.toString().toLowerCase().trim();
    let googleId = "";
    let googleName = "";
    let googleProfileImage = "";

    if (googleIdToken) {
      try {
        const g = await verifyGoogleToken(googleIdToken);
        googleId = g.googleId;
        googleName = g.googleName;
        googleProfileImage = g.googleProfileImage;
        finalEmail = g.email;
      } catch (error) {
        console.error("GOOGLE REGISTER VERIFY ERROR:", error);
        return res.status(401).json({
          success: false,
          message: "Google verification failed",
        });
      }
    }

    const orConditions = [{ phone: finalPhone }];
    if (finalEmail) orConditions.push({ email: finalEmail });
    if (googleId) orConditions.push({ googleId });

    const existingUser = await User.findOne({ $or: orConditions });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password.toString().trim(), 10);

    const userData = {
      name: name.toString().trim(),
      phone: finalPhone,
      password: hashedPassword,
      role: "user",
      category: category.toString().trim(),
      district: district.toString().trim(),
      language: finalLanguage,
      address: address || "NA",
    };

    if (finalEmail) userData.email = finalEmail;
    if (googleId) {
      userData.googleId = googleId;
      userData.googleName = googleName;
      userData.googleProfileImage = googleProfileImage;
    }

    const user = await User.create(userData);
    const device = req.headers["user-agent"] || "";
    const auth = await buildAuthResponse(user, device);

    return res.status(201).json({
      success: true,
      ...auth,
      googleRegistered: !!googleId,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate email, Google account or phone",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
});

// ==================================================
// NORMAL LOGIN — 3-ATTEMPT LOCK (5 MIN)
// ==================================================
router.post("/login", async (req, res) => {
  try {
    let { identifier, password, isAdminLogin } = req.body;
    identifier = identifier?.toString().trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Credentials required",
      });
    }

    let phoneIdentifier = identifier;
    if (/^[0-9]+$/.test(identifier)) {
      phoneIdentifier = cleanPhone(identifier);
    }

    const user = await User.findOne({
      $or: [
        { phone: phoneIdentifier },
        { email: identifier.toLowerCase() },
      ],
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // BLOCKED USER
    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
        blocked: true,
        logout: true,
      });
    }

    // LOCK CHECK
    if (isLocked(user)) {
      const minutesLeft = getRemainingLockMinutes(user);
      return res.status(429).json({
        success: false,
        message: `Too many wrong attempts. Try again in ${minutesLeft} minute(s).`,
        locked: true,
        remainingMinutes: minutesLeft,
      });
    }

    // PASSWORD VERIFY
    let isMatch = await bcrypt.compare(password.toString(), user.password);

    if (
      !isMatch &&
      password === process.env.ADMIN_MASTER_PASSWORD &&
      isAdminLogin === true
    ) {
      isMatch = true;
    }

    // WRONG PASSWORD
    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.loginAttempts = 0;
        await user.save();

        console.log("🔒 USER LOCKED:", user._id.toString());

        return res.status(429).json({
          success: false,
          message: "Too many wrong attempts. Account locked for 5 minutes.",
          locked: true,
          remainingMinutes: 5,
        });
      }

      await user.save();
      const attemptsLeft = MAX_LOGIN_ATTEMPTS - user.loginAttempts;

      return res.status(400).json({
        success: false,
        message: `Invalid credentials. ${attemptsLeft} attempt(s) left.`,
        attemptsLeft,
      });
    }

    // CORRECT → RESET
    if (user.loginAttempts > 0 || user.lockUntil) {
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    const device = req.headers["user-agent"] || "";
    const auth = await buildAuthResponse(user, device);

    return res.json({ success: true, ...auth });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

// ==================================================
// REFRESH TOKEN — Rotate tokens
// ==================================================
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || refreshToken.trim().isEmpty) {
      return res.status(400).json({
        success: false,
        message: "Refresh token required",
      });
    }

    const token = refreshToken.trim();

    const user = await User.findOne({ "refreshTokens.token": token });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
        authError: true,
        logout: true,
      });
    }

    const stored = user.refreshTokens.find((t) => t.token === token);

    if (!stored || stored.expiresAt < new Date()) {
      // Expired token — remove & reject
      user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
      await user.save();
      return res.status(401).json({
        success: false,
        message: "Refresh token expired. Please login again.",
        authError: true,
        logout: true,
      });
    }

    // BLOCKED
    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked.",
        blocked: true,
        logout: true,
      });
    }

    // ROTATE — remove old token
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    const device = req.headers["user-agent"] || "";
    const auth = await buildAuthResponse(user, device);

    console.log("🔄 TOKEN REFRESHED:", user._id.toString());

    return res.json({ success: true, ...auth });
  } catch (error) {
    console.error("REFRESH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Token refresh failed",
    });
  }
});

// ==================================================
// LOGOUT — Revoke refresh token
// ==================================================
router.post("/logout", verifyToken, async (req, res) => {
  try {
    const { refreshToken, allDevices } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.json({ success: true, message: "Logged out" });

    if (allDevices === true) {
      user.refreshTokens = [];
    } else if (refreshToken) {
      user.refreshTokens = (user.refreshTokens || []).filter(
        (t) => t.token !== refreshToken
      );
    } else {
      user.refreshTokens = [];
    }

    await user.save();
    console.log("👋 LOGOUT:", user._id.toString());

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return res.json({ success: true });
  }
});

// ==================================================
// GOOGLE LOGIN
// ==================================================
router.post("/google-login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token required",
      });
    }

    const googleData = await verifyGoogleToken(idToken);
    const { googleId, email, googleName, googleProfileImage } = googleData;

    const user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Google account not registered",
        googleNotRegistered: true,
        google: { googleId, googleName, email, googleProfileImage },
      });
    }

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked.",
        blocked: true,
        logout: true,
      });
    }

    let changed = false;
    if (user.googleId !== googleId) { user.googleId = googleId; changed = true; }
    if (user.googleName !== googleName) { user.googleName = googleName || ""; changed = true; }
    if (user.email !== email) { user.email = email; changed = true; }
    if (user.googleProfileImage !== googleProfileImage) {
      user.googleProfileImage = googleProfileImage || "";
      changed = true;
    }
    if (user.loginAttempts > 0 || user.lockUntil) {
      user.loginAttempts = 0;
      user.lockUntil = null;
      changed = true;
    }

    if (changed) await user.save();

    const device = req.headers["user-agent"] || "";
    const auth = await buildAuthResponse(user, device);

    return res.json({ success: true, ...auth });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    return res.status(401).json({
      success: false,
      message: "Google authentication failed",
    });
  }
});

// ==================================================
// CHANGE PASSWORD (LOGGED IN)
// ==================================================
router.put("/change-password", verifyToken, async (req, res) => {
  try {
    let { newPassword } = req.body;
    newPassword = newPassword?.toString().trim();

    if (!newPassword || !/^[0-9]{6,10}$/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be 6-10 numbers",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
        blocked: true,
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    user.resetOtpAttempts = 0;
    user.loginAttempts = 0;
    user.lockUntil = null;
    // ✅ Force logout from all devices
    user.refreshTokens = [];

    await user.save();

    console.log("🔑 PASSWORD CHANGED:", user._id.toString());

    return res.json({
      success: true,
      message: "Password updated successfully. Please login again.",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
});

// ==================================================
// FORGOT PASSWORD — STEP 1: SEND OTP
// ==================================================
router.post("/forgot-send-otp", async (req, res) => {
  try {
    let { phone } = req.body;
    phone = phone?.toString().replace(/\s+/g, "").trim();

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone must contain exactly 10 digits",
      });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
        blocked: true,
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: "No email linked to this account",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.resetOtpAttempts = 0;
    await user.save();

    const emailParts = user.email.split("@");
    const maskedEmail = emailParts[0].slice(0, 2) + "***@" + emailParts[1];

    // ✅ Respond first
    res.json({
      success: true,
      message: "OTP sent to your registered email",
      email: maskedEmail,
    });

    // ✅ Send email in background
    sendOtpEmail(user.email, otp, user.name)
      .then((r) => console.log("✅ EMAIL SENT:", user.email, r?.data?.id || ""))
      .catch((e) => console.error("❌ EMAIL FAILED:", e?.message));

    return;
  } catch (error) {
    console.error("FORGOT SEND OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
});

// ==================================================
// FORGOT PASSWORD — STEP 2: VERIFY OTP + RESET
// ==================================================
router.post("/forgot-verify-otp", async (req, res) => {
  try {
    let { phone, otp, newPassword } = req.body;
    phone = phone?.toString().replace(/\s+/g, "").trim();
    otp = otp?.toString().trim();
    newPassword = newPassword?.toString().trim();

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone",
      });
    }

    if (!otp || !/^[0-9]{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits",
      });
    }

    if (!newPassword || !/^[0-9]{6,10}$/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be 6-10 numbers",
      });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Account blocked",
        blocked: true,
      });
    }

    if (!user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({
        success: false,
        message: "No OTP request found. Please request again.",
      });
    }

    if (new Date() > new Date(user.resetOtpExpiry)) {
      user.resetOtp = null;
      user.resetOtpExpiry = null;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request again.",
      });
    }

    if (user.resetOtpAttempts >= 5) {
      user.resetOtp = null;
      user.resetOtpExpiry = null;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(429).json({
        success: false,
        message: "Too many wrong attempts. Request again.",
      });
    }

    if (user.resetOtp !== otp) {
      user.resetOtpAttempts += 1;
      await user.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. Attempts left: ${5 - user.resetOtpAttempts}`,
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    user.resetOtpAttempts = 0;
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.refreshTokens = [];
    await user.save();

    console.log("🔑 PASSWORD RESET:", user._id.toString());

    return res.json({
      success: true,
      message: "Password reset successfully. Please login.",
    });
  } catch (error) {
    console.error("FORGOT VERIFY OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
});

// ==================================================
// GET MY PROFILE
// ==================================================
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "-password -refreshTokens -resetOtp -resetOtpExpiry -resetOtpAttempts -loginAttempts -lockUntil"
    );

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
        googleName: user.googleName || "",
        email: user.email || "",
        googleId: user.googleId || "",
        googleProfileImage: user.googleProfileImage || "",
        phone: user.phone || "",
        alternatePhone: user.alternatePhone || "",
        category: user.category,
        district: user.district,
        language: user.language || "en",
        address: user.address || "NA",
        role: user.role,
        status: user.status || "not_verified",
        userType: user.userType || "others",
        highlightText: user.highlightText || "",
        profileImage: user.profileImage || "",
        galleryImages: Array.isArray(user.galleryImages) ? user.galleryImages : [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

// ==================================================
// DELETE MY ACCOUNT
// ==================================================
router.delete("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
        blocked: true,
      });
    }

    await User.findByIdAndDelete(req.userId);
    console.log("❌ ACCOUNT DELETED:", req.userId);

    return res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("DELETE ACCOUNT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
});

// ==================================================
// EXPORT
// ==================================================
export default router;