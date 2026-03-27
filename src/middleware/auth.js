import jwt from "jsonwebtoken";
import User from "../models/user_model.js";

/* ================= VERIFY TOKEN ================= */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    /// ❌ NO TOKEN
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    /// ❌ SECRET NOT SET (safety)
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not defined");
      return res.status(500).json({
        success: false,
        message: "Server config error",
      });
    }

    let decoded;

    /// ✅ VERIFY TOKEN (SAFE)
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    /// ✅ FETCH USER (FAST)
    const user = await User.findById(decoded.id)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    /// ✅ ATTACH USER
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (err) {
    console.error("AUTH ERROR 👉", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ================= ADMIN ONLY ================= */
export const isAdmin = (req, res, next) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins only",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};