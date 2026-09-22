import jwt from "jsonwebtoken";
import User from "../models/user/user_model.js";

// ============================================================
// VERIFY TOKEN
// ============================================================

export const verifyToken = async (req, res, next) => {
  try {
    // ----------------------------------------------------------
    // AUTH HEADER
    // ----------------------------------------------------------

    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        authError: true,
        logout: true,
      });
    }

    // ----------------------------------------------------------
    // TOKEN
    // ----------------------------------------------------------

    const token = authHeader
      .substring(7)
      .trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing",
        authError: true,
        logout: true,
      });
    }

    // ----------------------------------------------------------
    // VERIFY JWT
    // ----------------------------------------------------------

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // ----------------------------------------------------------
    // USER ID
    // ----------------------------------------------------------

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        authError: true,
        logout: true,
      });
    }

    // ----------------------------------------------------------
    // FIND USER
    // ----------------------------------------------------------

    const user = await User.findById(
      decoded.id
    ).select("-password");

    // ----------------------------------------------------------
    // USER DELETED
    // ----------------------------------------------------------

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found",
        authError: true,
        logout: true,
      });
    }

    // ----------------------------------------------------------
    // BLOCKED USER
    //
    // IMPORTANT:
    // Your project uses userType === "black"
    // NOT verification === "black"
    // ----------------------------------------------------------

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked. Please contact support.",
        blocked: true,
        authError: true,
        logout: true,
      });
    }

    // ----------------------------------------------------------
    // ATTACH USER TO REQUEST
    // ----------------------------------------------------------

    req.user = user;
    req.userId = user._id;

    // ----------------------------------------------------------
    // CONTINUE
    // ----------------------------------------------------------

    next();
  } catch (error) {
    console.error(
      "AUTH ERROR 👉",
      error?.name,
      error?.message
    );

    // ----------------------------------------------------------
    // TOKEN EXPIRED
    // ----------------------------------------------------------

    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication session expired",
        authError: true,
        tokenExpired: true,
        logout: true,
      });
    }

    // ----------------------------------------------------------
    // INVALID TOKEN
    // ----------------------------------------------------------

    if (error?.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        authError: true,
        logout: true,
      });
    }

    // ----------------------------------------------------------
    // OTHER AUTH ERROR
    // ----------------------------------------------------------

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

export const isAdmin = (
  req,
  res,
  next
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      authError: true,
      logout: true,
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admins only",
      adminRequired: true,
    });
  }

  next();
};