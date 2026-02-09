import jwt from "jsonwebtoken";
import User from "../models/user_model.js";

export const verifyTokenOptional = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // PUBLIC
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("role");
    if (user) {
      req.user = user; // ✅ role available
    }
  } catch (err) {
    req.user = null;
  }

  next();
};
