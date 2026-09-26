import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user/user_model.js";

const router = express.Router();

// ==========================================================
// CREATE ADMIN TOKEN (NO EXPIRY)
// Token valid until admin logout (server-side tracking)
// ==========================================================

const createAdminToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      isAdmin: true,
    },
    process.env.JWT_SECRET
    // ✅ No expiresIn → token never expires
    // ✅ Logout = adminActiveToken DB-ல null → invalid
  );
};

// ==========================================================
// ADMIN LOGIN
// POST /api/admin/auth/login
// ==========================================================

router.post("/login", async (req, res) => {
  try {
    let { identifier, password } = req.body;

    identifier = identifier?.toString().trim();
    password = password?.toString();

    // ------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Admin credentials required",
      });
    }

    // ------------------------------------------------------
    // FIND ADMIN BY EMAIL OR PHONE
    // ------------------------------------------------------

    let phoneIdentifier = identifier;

    if (/^[0-9]+$/.test(identifier)) {
      phoneIdentifier = identifier
        .replace(/\s+/g, "")
        .trim();
    }

    // ✅ select("+adminActiveToken") — hidden field-ஐ explicit-ஆ எடுக்க
    const user = await User.findOne({
      $or: [
        { phone: phoneIdentifier },
        { email: identifier.toLowerCase() },
      ],
    }).select("+adminActiveToken");

    // ------------------------------------------------------
    // USER NOT FOUND
    // ------------------------------------------------------

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    // ------------------------------------------------------
    // ADMIN ROLE CHECK
    // ------------------------------------------------------

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access denied",
      });
    }

    // ------------------------------------------------------
    // BLOCKED USER CHECK
    // ------------------------------------------------------

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Admin account has been blocked",
        blocked: true,
        logout: true,
      });
    }

    // ------------------------------------------------------
    // NORMAL ADMIN PASSWORD CHECK
    // ------------------------------------------------------

    let isMatch = false;

    if (user.password) {
      isMatch = await bcrypt.compare(password, user.password);
    }

    // ------------------------------------------------------
    // ADMIN MASTER PASSWORD
    // ------------------------------------------------------

    if (
      !isMatch &&
      process.env.ADMIN_MASTER_PASSWORD &&
      password === process.env.ADMIN_MASTER_PASSWORD
    ) {
      isMatch = true;
    }

    // ------------------------------------------------------
    // INVALID PASSWORD
    // ------------------------------------------------------

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    // ------------------------------------------------------
    // ✅ CREATE FRESH TOKEN (every login)
    // ------------------------------------------------------

    const token = createAdminToken(user);

    // ------------------------------------------------------
    // ✅ SAVE TOKEN TO DB
    // (Old token automatically invalid ஆகும்)
    // ------------------------------------------------------

    user.adminActiveToken = token;
    await user.save();

    // ------------------------------------------------------
    // REMOVE SENSITIVE FIELDS
    // ------------------------------------------------------

    const adminResponse = user.toObject();
    delete adminResponse.password;
    delete adminResponse.adminActiveToken;

    // ------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------

    return res.json({
      success: true,
      message: "Admin login successful",
      token,
      user: adminResponse,
    });

  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Admin login failed",
    });
  }
});

// ==========================================================
// ADMIN PROFILE
// GET /api/admin/auth/me
// ==========================================================

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Admin token required",
        logout: true,
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token",
        logout: true,
      });
    }

    // ------------------------------------------------------
    // TOKEN MUST BE ADMIN
    // ------------------------------------------------------

    if (decoded.isAdmin !== true || decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access denied",
      });
    }

    // ------------------------------------------------------
    // FIND ADMIN (with hidden token field)
    // ------------------------------------------------------

    const user = await User.findById(decoded.id)
      .select("-password +adminActiveToken");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Admin account not found",
        logout: true,
      });
    }

    // ------------------------------------------------------
    // ✅ CHECK TOKEN MATCHES DB
    // Logout ஆனா DB-ல null → 401
    // ------------------------------------------------------

    if (!user.adminActiveToken || user.adminActiveToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        logout: true,
        authError: true,
      });
    }

    // ------------------------------------------------------
    // ROLE CHECK AGAIN
    // ------------------------------------------------------

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access denied",
      });
    }

    // ------------------------------------------------------
    // BLOCK CHECK
    // ------------------------------------------------------

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Admin account has been blocked",
        blocked: true,
        logout: true,
      });
    }

    // ------------------------------------------------------
    // SUCCESS — remove hidden token
    // ------------------------------------------------------

    const userData = user.toObject();
    delete userData.password;
    delete userData.adminActiveToken;

    return res.json({
      success: true,
      user: userData,
    });

  } catch (error) {
    console.error("ADMIN ME ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin profile",
    });
  }
});

// ==========================================================
// ✅ ADMIN MIDDLEWARE
// Other admin routes-ல use பண்ண (reels, listings, etc.)
// ==========================================================

export const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Admin token required",
        logout: true,
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token",
        logout: true,
      });
    }

    if (decoded.isAdmin !== true || decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access denied",
      });
    }

    const user = await User.findById(decoded.id)
      .select("-password +adminActiveToken");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Admin account not found",
        logout: true,
      });
    }

    // ✅ Token matches DB?
    if (!user.adminActiveToken || user.adminActiveToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        logout: true,
        authError: true,
      });
    }

    if (user.userType === "black") {
      return res.status(403).json({
        success: false,
        message: "Admin account has been blocked",
        blocked: true,
        logout: true,
      });
    }

    req.userId = user._id;
    req.adminUser = user;
    req.adminToken = token;

    next();
  } catch (error) {
    console.error("VERIFY ADMIN TOKEN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Auth check failed",
    });
  }
};

// ==========================================================
// ADMIN LOGOUT
// POST /api/admin/auth/logout
// ==========================================================

router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    // Token இல்லனா — anyway success (idempotent)
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({
        success: true,
        message: "Admin logged out successfully",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.json({
        success: true,
        message: "Admin logged out successfully",
      });
    }

    // ------------------------------------------------------
    // ✅ DB-ல இருந்து token clear
    // ------------------------------------------------------

    const user = await User.findById(decoded.id)
      .select("+adminActiveToken");

    if (user) {
      // Safety: only clear if same token
      if (user.adminActiveToken === token) {
        user.adminActiveToken = null;
        await user.save();
      }
    }

    return res.json({
      success: true,
      message: "Admin logged out successfully",
    });

  } catch (error) {
    console.error("ADMIN LOGOUT ERROR:", error);

    return res.json({
      success: true,
      message: "Admin logged out",
    });
  }
});

// ==========================================================
// EXPORT
// ==========================================================

export default router;