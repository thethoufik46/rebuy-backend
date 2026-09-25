import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user/user_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

const createToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, isAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

// ==================================================
// ADMIN LOGIN
// POST /api/auth/admin/login
// ==================================================
router.post("/login", async (req, res) => {
  try {
    let { identifier, password } = req.body;
    identifier = identifier?.toString().trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Credentials required",
      });
    }

    const phoneIdentifier = /^[0-9]+$/.test(identifier)
      ? identifier.replace(/\s+/g, "").trim()
      : identifier;

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

    if (user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized as admin",
        notAdmin: true,
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

    const isMatch = await bcrypt.compare(password.toString(), user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = createToken(user);
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log("🔐 ADMIN LOGIN:", user._id.toString());

    return res.json({
      success: true,
      isAdmin: true,
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Admin login failed",
    });
  }
});

// ==================================================
// ADMIN ME
// GET /api/auth/admin/me
// ==================================================
router.get("/me", verifyToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({
      success: true,
      isAdmin: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email || "",
        phone: user.phone || "",
        role: user.role,
        status: user.status || "not_verified",
        userType: user.userType || "others",
        profileImage: user.profileImage || "",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed" });
  }
});

// ==================================================
// ADMIN LOGOUT
// POST /api/auth/admin/logout
// ==================================================
router.post("/logout", verifyToken, isAdmin, async (req, res) => {
  try {
    console.log("👋 ADMIN LOGOUT:", req.userId);
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.json({ success: true });
  }
});

export default router;