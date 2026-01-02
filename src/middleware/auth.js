import jwt from "jsonwebtoken";
import User from "../models/user_model.js";

/* ---------------- VERIFY TOKEN ---------------- */
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

    // ✅ VERIFY TOKEN
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ FETCH USER (❌ NO lean())
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // ✅ ATTACH USER (MONGOOSE DOCUMENT)
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

/* ---------------- ADMIN ONLY ---------------- */
export const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admins only",
    });
  }
  next();
};
