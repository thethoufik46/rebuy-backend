import jwt from "jsonwebtoken";
import User from "../models/user_model.js";

/* =====================================================
   🔐 VERIFY TOKEN (PRODUCTION READY)
===================================================== */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    /// ❌ NO TOKEN
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    /// 🔍 FETCH USER
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    /// ✅ ATTACH USER DATA
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (err) {
    console.error("AUTH ERROR 👉", err);

    return res.status(500).json({
      success: false,
      message: "Server error in authentication",
    });
  }
};

/* =====================================================
   👑 ADMIN ONLY
===================================================== */
export const isAdmin = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied (Admin only)",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error in admin check",
    });
  }
};

/* =====================================================
   🔥 OPTIONAL: OPTIONAL AUTH (Guest + Logged-in both)
===================================================== */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // 👉 allow guest
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (user) {
      req.user = user;
      req.userId = user._id.toString();
    }

    next();
  } catch (err) {
    next(); // 👉 fail silently (important)
  }
};