// ======================= verifyTokenOptional.js =======================
import jwt from "jsonwebtoken";
import User from "../models/user_model.js";

export const verifyTokenOptional = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("role email");
    req.user = user || null;
  } catch (err) {
    req.user = null;
  }

  next();
};
