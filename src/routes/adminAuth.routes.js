// ======================= src/routes/adminAuth.routes.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.

import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user/user_model.js";

const router = express.Router();

const createAdminToken = (user) => {
  // No expiresIn → token never expires.
  // Logout = adminActiveToken DB-ல null → invalid.
  return jwt.sign(
    { id: user._id, role: user.role, isAdmin: true },
    process.env.JWT_SECRET
  );
};

// ==========================================================
// ADMIN LOGIN — POST /api/admin/auth/login
// ==========================================================

router.post("/login", async (req, res) => {
  try {
    let { identifier, password } = req.body;
    identifier = identifier?.toString().trim();
    password = password?.toString();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Admin credentials required" });
    }

    let phoneIdentifier = identifier;
    if (/^[0-9]+$/.test(identifier)) {
      phoneIdentifier = identifier.replace(/\s+/g, "").trim();
    }

    const user = await User.findOne({
      $or: [{ phone: phoneIdentifier }, { email: identifier.toLowerCase() }],
    }).select("+adminActiveToken");

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access denied" });
    }

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Admin account has been blocked",
        blocked: true,
        logout: true,
      });
    }

    let isMatch = false;
    if (user.password) {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch && process.env.ADMIN_MASTER_PASSWORD && password === process.env.ADMIN_MASTER_PASSWORD) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials" });
    }

    // Fresh token — every login
    const token = createAdminToken(user);

    // Save to DB — old token invalid ஆகும்
    user.adminActiveToken = token;
    await user.save();

    const adminResponse = user.toObject();
    delete adminResponse.password;
    delete adminResponse.adminActiveToken;

    return res.json({
      success: true,
      message: "Admin login successful",
      token,
      user: adminResponse,
    });
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Admin login failed" });
  }
});

// ==========================================================
// ADMIN PROFILE — GET /api/admin/auth/me
// ==========================================================

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Admin token required", logout: true });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid admin token", logout: true });
    }

    if (decoded.isAdmin !== true || decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access denied" });
    }

    const user = await User.findById(decoded.id).select("-password +adminActiveToken");
    if (!user) {
      return res.status(401).json({ success: false, message: "Admin account not found", logout: true });
    }

    // Token matches DB?
    if (!user.adminActiveToken || user.adminActiveToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        logout: true,
        authError: true,
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access denied" });
    }

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Admin account has been blocked",
        blocked: true,
        logout: true,
      });
    }

    const userData = user.toObject();
    delete userData.password;
    delete userData.adminActiveToken;

    return res.json({ success: true, user: userData });
  } catch (error) {
    console.error("ADMIN ME ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch admin profile" });
  }
});

// ==========================================================
// ADMIN MIDDLEWARE — reels, listings etc.
// ==========================================================

export const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Admin token required", logout: true });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid admin token", logout: true });
    }

    if (decoded.isAdmin !== true || decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access denied" });
    }

    const user = await User.findById(decoded.id).select("-password +adminActiveToken");
    if (!user) {
      return res.status(401).json({ success: false, message: "Admin account not found", logout: true });
    }

    if (!user.adminActiveToken || user.adminActiveToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        logout: true,
        authError: true,
      });
    }

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Admin account has been blocked",
        blocked: true,
        logout: true,
      });
    }

    req.userId = user._id;
    req.adminUser = user;
    req.adminToken = token;

    next();
  } catch (error) {
    console.error("VERIFY ADMIN TOKEN ERROR:", error);
    return res.status(500).json({ success: false, message: "Auth check failed" });
  }
};

// ==========================================================
// ADMIN LOGOUT — POST /api/admin/auth/logout
// ==========================================================

router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({ success: true, message: "Admin logged out successfully" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.json({ success: true, message: "Admin logged out successfully" });
    }

    const user = await User.findById(decoded.id).select("+adminActiveToken");
    if (user && user.adminActiveToken === token) {
      user.adminActiveToken = null;
      await user.save();
    }

    return res.json({ success: true, message: "Admin logged out successfully" });
  } catch (error) {
    console.error("ADMIN LOGOUT ERROR:", error);
    return res.json({ success: true, message: "Admin logged out" });
  }
});

export default router;