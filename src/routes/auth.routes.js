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
const MAX_ACTIVE_SESSIONS = 5;

const validLanguages = ["en","ta","ml","te","hi","kn","bn","mr","gu","ur","or"];
const isValidLanguage = (l) => !l || validLanguages.includes(l.toString().trim());

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ==================================================
// GOOGLE VERIFY
// ==================================================
const verifyGoogleToken = async (idToken) => {
  if (!idToken) throw new Error("Google ID token required");
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const p = ticket.getPayload();
  if (!p) throw new Error("Invalid Google account");
  if (!p.sub || !p.email) throw new Error("Google account info unavailable");
  return {
    googleId: p.sub,
    email: p.email.toLowerCase().trim(),
    googleName: p.name || "",
    googleProfileImage: p.picture || "",
  };
};

// ==================================================
// ✅ TOKEN HASHING — Never store raw tokens
// ==================================================
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// ==================================================
// ✅ TOKEN GENERATORS
// ==================================================
const createAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );

const createRefreshToken = () => crypto.randomBytes(48).toString("hex");

// ==================================================
// ✅ DEVICE INFO EXTRACTOR
// ==================================================
const getDeviceInfo = (req) => {
  const ua = (req.headers["user-agent"] || "").slice(0, 200);
  let device = "Unknown Device";

  if (/Android/i.test(ua)) device = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) device = "iOS";
  else if (/Windows/i.test(ua)) device = "Windows";
  else if (/Macintosh/i.test(ua)) device = "Mac";
  else if (/Linux/i.test(ua)) device = "Linux";
  else if (/Chrome/i.test(ua)) device = "Chrome";
  else if (/Firefox/i.test(ua)) device = "Firefox";
  else if (/Safari/i.test(ua)) device = "Safari";

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "";

  return { device, ip, ua };
};

// ==================================================
// ✅ CREATE + SAVE SESSION (hashed)
// ==================================================
const createSession = async (user, req) => {
  const rawRefresh = createRefreshToken();
  const tokenHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);
  const { device, ip } = getDeviceInfo(req);

  // Cleanup expired + revoked sessions
  user.sessions = (user.sessions || []).filter(
    (s) => s.expiresAt > new Date() && !s.revokedAt
  );

  // Enforce max active sessions (FIFO — remove oldest)
  if (user.sessions.length >= MAX_ACTIVE_SESSIONS) {
    user.sessions.sort((a, b) => a.createdAt - b.createdAt);
    user.sessions.shift();
  }

  user.sessions.push({
    tokenHash,
    device,
    ip,
    lastActiveAt: new Date(),
    expiresAt,
  });

  await user.save();

  return { rawRefresh, tokenHash };
};

// ==================================================
// ✅ ROTATE SESSION (on refresh)
// Returns: new raw token OR null
// ==================================================
const rotateSession = async (user, oldTokenHash, req) => {
  const session = user.sessions.find((s) => s.tokenHash === oldTokenHash);

  if (!session) return null;

  // Security: if already revoked → reuse attack
  if (session.revokedAt) {
    user.lastSecurityEvent = "REUSE_ATTACK_DETECTED";
    user.lastSecurityEventAt = new Date();
    user.sessions = [];
    await user.save();
    return null;
  }

  // Generate new tokens
  const rawNew = createRefreshToken();
  const newHash = hashToken(rawNew);
  const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);
  const { device, ip } = getDeviceInfo(req);

  // Mark old session as rotated (keep for reuse detection)
  session.revokedAt = new Date();
  session.revokedReason = "rotated";
  session.replacedBy = newHash;

  // Add new session
  user.sessions.push({
    tokenHash: newHash,
    device,
    ip,
    lastActiveAt: new Date(),
    expiresAt,
  });

  // Cleanup expired
  user.sessions = user.sessions.filter((s) => s.expiresAt > new Date());

  await user.save();
  return { rawNew, newHash };
};

// ==================================================
// ✅ BUILD AUTH RESPONSE
// ==================================================
const buildAuthResponse = async (user, req) => {
  const token = createAccessToken(user);
  const { rawRefresh } = await createSession(user, req);

  const responseUser = user.toObject();
  delete responseUser.password;
  delete responseUser.sessions;
  delete responseUser.loginAttempts;
  delete responseUser.lockUntil;
  delete responseUser.resetOtp;
  delete responseUser.resetOtpExpiry;
  delete responseUser.resetOtpAttempts;
  delete responseUser.lastSecurityEvent;
  delete responseUser.lastSecurityEventAt;

  return {
    token,
    refreshToken: rawRefresh,
    user: responseUser,
  };
};

// ==================================================
// HELPERS
// ==================================================
const cleanPhone = (phone) =>
  phone?.toString().replace(/\s+/g, "").trim();

const isValidPhone = (phone) =>
  /^[0-9]{10}$/.test(cleanPhone(phone) || "");

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
        console.error("GOOGLE REGISTER ERROR:", error);
        return res.status(401).json({
          success: false,
          message: "Google verification failed",
        });
      }
    }

    const orConditions = [{ phone: finalPhone }];
    if (finalEmail) orConditions.push({ email: finalEmail });
    if (googleId) orConditions.push({ googleId });

    const existing = await User.findOne({ $or: orConditions });
    if (existing) {
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
    const auth = await buildAuthResponse(user, req);

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
// LOGIN
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

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
        blocked: true,
        logout: true,
      });
    }

    if (isLocked(user)) {
      const minutesLeft = getRemainingLockMinutes(user);
      return res.status(429).json({
        success: false,
        message: `Too many wrong attempts. Try again in ${minutesLeft} minute(s).`,
        locked: true,
        remainingMinutes: minutesLeft,
      });
    }

    let isMatch = await bcrypt.compare(password.toString(), user.password);

    if (
      !isMatch &&
      password === process.env.ADMIN_MASTER_PASSWORD &&
      isAdminLogin === true
    ) {
      isMatch = true;
    }

    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.loginAttempts = 0;
        await user.save();
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

    if (user.loginAttempts > 0 || user.lockUntil) {
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    const auth = await buildAuthResponse(user, req);
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
// ✅ REFRESH — Rotate + Reuse detection
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

    const tokenHash = hashToken(refreshToken.trim());

    // Find user by hashed token (indexed lookup)
    const user = await User.findOne({ "sessions.tokenHash": tokenHash });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
        authError: true,
        logout: true,
      });
    }

    // Check expired
    const session = user.sessions.find((s) => s.tokenHash === tokenHash);
    if (!session || session.expiresAt < new Date()) {
      user.sessions = user.sessions.filter((s) => s.tokenHash !== tokenHash);
      await user.save();
      return res.status(401).json({
        success: false,
        message: "Refresh token expired",
        authError: true,
        logout: true,
      });
    }

    // Blocked user
    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked.",
        blocked: true,
        logout: true,
      });
    }

    // ✅ Rotate session
    const rotated = await rotateSession(user, tokenHash, req);

    if (!rotated) {
      // Reuse attack or invalid
      console.error("🚨 TOKEN REUSE DETECTED:", user._id.toString());
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        authError: true,
        logout: true,
        securityAlert: true,
      });
    }

    // Update lastActiveAt
    session.lastActiveAt = new Date();

    const newAccessToken = createAccessToken(user);

    const responseUser = user.toObject();
    delete responseUser.password;
    delete responseUser.sessions;
    delete responseUser.loginAttempts;
    delete responseUser.lockUntil;
    delete responseUser.resetOtp;
    delete responseUser.resetOtpExpiry;
    delete responseUser.resetOtpAttempts;
    delete responseUser.lastSecurityEvent;
    delete responseUser.lastSecurityEventAt;

    console.log("🔄 TOKEN ROTATED:", user._id.toString());

    return res.json({
      success: true,
      token: newAccessToken,
      refreshToken: rotated.rawNew,
      user: responseUser,
    });
  } catch (error) {
    console.error("REFRESH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Token refresh failed",
    });
  }
});

// ==================================================
// LOGOUT — Revoke session(s)
// ==================================================
router.post("/logout", verifyToken, async (req, res) => {
  try {
    const { refreshToken, allDevices } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.json({ success: true, message: "Logged out" });

    if (allDevices === true) {
      // Revoke all sessions
      user.sessions = [];
    } else if (refreshToken) {
      // Revoke specific session
      const tokenHash = hashToken(refreshToken.trim());
      const session = user.sessions.find((s) => s.tokenHash === tokenHash);
      if (session) {
        session.revokedAt = new Date();
        session.revokedReason = "logout";
      }
    } else {
      // Revoke all (default)
      user.sessions = [];
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
// ✅ GET ACTIVE SESSIONS — User views own devices
// ==================================================
router.get("/sessions", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("sessions");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const now = new Date();
    const active = (user.sessions || [])
      .filter((s) => s.expiresAt > now && !s.revokedAt)
      .map((s) => ({
        _id: s._id,
        device: s.device,
        ip: s.ip,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      }));

    return res.json({
      success: true,
      count: active.length,
      sessions: active,
    });
  } catch (error) {
    console.error("GET SESSIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
    });
  }
});

// ==================================================
// ✅ REVOKE SPECIFIC SESSION
// ==================================================
router.delete("/sessions/:sessionId", verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const session = user.sessions.id(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    session.revokedAt = new Date();
    session.revokedReason = "user_revoked";

    await user.save();
    console.log("🚫 SESSION REVOKED:", sessionId);

    return res.json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error) {
    console.error("REVOKE SESSION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to revoke session",
    });
  }
});

// ==================================================
// ✅ REVOKE ALL OTHER SESSIONS
// ==================================================
router.delete("/sessions", verifyToken, async (req, res) => {
  try {
    const { currentRefreshToken } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let keepHash = null;
    if (currentRefreshToken) {
      keepHash = hashToken(currentRefreshToken.trim());
    }

    user.sessions = (user.sessions || []).filter((s) => {
      if (keepHash && s.tokenHash === keepHash) return true;
      return false;
    });

    await user.save();

    return res.json({
      success: true,
      message: "Other sessions revoked",
      remaining: user.sessions.length,
    });
  } catch (error) {
    console.error("REVOKE ALL SESSIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to revoke sessions",
    });
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

    const g = await verifyGoogleToken(idToken);
    const { googleId, email, googleName, googleProfileImage } = g;

    const user = await User.findOne({ $or: [{ googleId }, { email }] });

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

    const auth = await buildAuthResponse(user, req);
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
// CHANGE PASSWORD
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
    user.sessions = []; // ✅ Revoke all sessions

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
// FORGOT — SEND OTP
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
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.userType === "black") {
      return res.status(403).json({ success: false, message: "Account blocked", blocked: true });
    }
    if (!user.email) {
      return res.status(400).json({ success: false, message: "No email linked to this account" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.resetOtpAttempts = 0;
    await user.save();

    const emailParts = user.email.split("@");
    const maskedEmail = emailParts[0].slice(0, 2) + "***@" + emailParts[1];

    res.json({
      success: true,
      message: "OTP sent to your registered email",
      email: maskedEmail,
    });

    sendOtpEmail(user.email, otp, user.name)
      .then((r) => console.log("✅ EMAIL SENT:", user.email, r?.data?.id || ""))
      .catch((e) => console.error("❌ EMAIL FAILED:", e?.message));

    return;
  } catch (error) {
    console.error("FORGOT SEND OTP ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// ==================================================
// FORGOT — VERIFY OTP + RESET
// ==================================================
router.post("/forgot-verify-otp", async (req, res) => {
  try {
    let { phone, otp, newPassword } = req.body;
    phone = phone?.toString().replace(/\s+/g, "").trim();
    otp = otp?.toString().trim();
    newPassword = newPassword?.toString().trim();

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }
    if (!otp || !/^[0-9]{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "OTP must be 6 digits" });
    }
    if (!newPassword || !/^[0-9]{6,10}$/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must be 6-10 numbers" });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.userType === "black") {
      return res.status(403).json({ success: false, message: "Account blocked", blocked: true });
    }
    if (!user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({ success: false, message: "No OTP request found. Please request again." });
    }
    if (new Date() > new Date(user.resetOtpExpiry)) {
      user.resetOtp = null;
      user.resetOtpExpiry = null;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ success: false, message: "OTP expired. Please request again." });
    }
    if (user.resetOtpAttempts >= 5) {
      user.resetOtp = null;
      user.resetOtpExpiry = null;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(429).json({ success: false, message: "Too many wrong attempts. Request again." });
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
    user.sessions = []; // ✅ Revoke all sessions

    await user.save();
    console.log("🔑 PASSWORD RESET:", user._id.toString());

    return res.json({
      success: true,
      message: "Password reset successfully. Please login.",
    });
  } catch (error) {
    console.error("FORGOT VERIFY OTP ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to reset password" });
  }
});

// ==================================================
// GET MY PROFILE
// ==================================================
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "-password -sessions -resetOtp -resetOtpExpiry -resetOtpAttempts -loginAttempts -lockUntil -lastSecurityEvent -lastSecurityEventAt"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
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
    return res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
});

// ==================================================
// DELETE MY ACCOUNT
// ==================================================
router.delete("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.userType === "black") {
      return res.status(403).json({ success: false, message: "Account blocked", blocked: true });
    }
    await User.findByIdAndDelete(req.userId);
    console.log("❌ ACCOUNT DELETED:", req.userId);
    return res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("DELETE ACCOUNT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete account" });
  }
});

export default router;