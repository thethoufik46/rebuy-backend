// src/middleware/auth.js

import jwt from "jsonwebtoken";
import User from "../models/user_model.js";

/* ================= VERIFY TOKEN ================= */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing or malformed",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user (exclude password)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (err) {
    // Provide clear error messages for different JWT errors
    let message = "Invalid or expired token";
    if (err.name === "JsonWebTokenError") {
      message = "Invalid token";
    } else if (err.name === "TokenExpiredError") {
      message = "Token expired";
    }

    console.error("AUTH ERROR:", err.message);

    return res.status(401).json({
      success: false,
      message,
    });
  }
};

/* ================= ADMIN ONLY ================= */
export const isAdmin = (req, res, next) => {
  // Ensure user is attached (should be done by verifyToken)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthenticated",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};