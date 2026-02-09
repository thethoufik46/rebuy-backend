// ======================= verifyTokenOptional.js =======================
// 🔓 Optional auth middleware
// - Token irundha decode pannum
// - Token illatti error podama next() pogum

import jwt from "jsonwebtoken";

export const verifyTokenOptional = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // ✅ NO TOKEN → PUBLIC USER
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, email ... }
  } catch (err) {
    // ❌ Invalid token → still allow public access
    req.user = null;
  }

  next();
};
