import jwt from "jsonwebtoken";
import User from "../models/user_model.js";

/* -------------------------------------------------
   ✅ Verify Token Middleware (Protected Routes)
---------------------------------------------------*/
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ Attach user info to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (err) {
    console.error("❌ Auth Error:", err.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/* -------------------------------------------------
   ✅ Admin Access Middleware
---------------------------------------------------*/
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admins only",
    });
  }
  next();
};
