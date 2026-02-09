// ======================= verifyTokenOptional.js =======================
// 🔓 Optional auth middleware (ADMIN decrypt support)

import jwt from "jsonwebtoken";
import User from "../models/user_model.js";

export const verifyTokenOptional = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // PUBLIC USER
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ SUPPORT BOTH id / _id
    const userId = decoded.id || decoded._id;

    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await User.findById(userId).select("role email");

    if (user) {
      req.user = user; // { role: "admin" }
    }
  } catch (err) {
    req.user = null;
  }

  next();
};
