import jwt from "jsonwebtoken";
import User from "../models/user/user_model.js";

// ============================================================
// VERIFY TOKEN
// ============================================================
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        authError: true,
        logout: true,
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing",
        authError: true,
        logout: true,
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        authError: true,
        logout: true,
      });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found",
        authError: true,
        logout: true,
      });
    }

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
        blocked: true,
        authError: true,
        logout: true,
      });
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error("AUTH ERROR 👉", error?.name, error?.message);

    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication session expired",
        authError: true,
        tokenExpired: true,
        logout: true,
      });
    }

    if (error?.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        authError: true,
        logout: true,
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      authError: true,
      logout: true,
    });
  }
};

// ============================================================
// ADMIN ONLY
// ============================================================
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      authError: true,
      logout: true,
    });
  }

  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Admins only",
      adminRequired: true,
    });
  }

  next();
};