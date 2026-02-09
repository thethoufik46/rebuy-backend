// ======================= verifyTokenOptional.js =======================
// 🔓 Optional auth middleware (ADMIN decrypt support)

import jwt from "jsonwebtoken";
import User from "../models/user_model.js";

export const verifyTokenOptional = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // PUBLIC USER
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 FETCH FULL USER (IMPORTANT)
    const user = await User.findById(decoded.id).select("role email");

    if (user) {
      req.user = user; // { role: "admin" }
    }
  } catch (err) {
    req.user = null;
  }

  next();
};
