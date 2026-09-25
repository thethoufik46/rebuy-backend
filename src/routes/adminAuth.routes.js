import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user/user_model.js";

const router = express.Router();

// ==========================================================
// ADMIN CONFIG
// ==========================================================

const ADMIN_ACCESS_EXPIRY = "1d";

// ==========================================================
// CREATE ADMIN TOKEN
// ==========================================================

const createAdminToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      isAdmin: true,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: ADMIN_ACCESS_EXPIRY,
    }
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

    const user = await User.findOne({
      $or: [
        {
          phone: phoneIdentifier,
        },
        {
          email: identifier.toLowerCase(),
        },
      ],
    });

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
      isMatch = await bcrypt.compare(
        password,
        user.password
      );
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
    // CREATE TOKEN
    // ------------------------------------------------------

    const token = createAdminToken(user);

    // ------------------------------------------------------
    // REMOVE PASSWORD
    // ------------------------------------------------------

    const adminResponse = user.toObject();

    delete adminResponse.password;

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
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired admin token",
      });
    }

    // ------------------------------------------------------
    // TOKEN MUST BE ADMIN
    // ------------------------------------------------------

    if (
      decoded.isAdmin !== true ||
      decoded.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Admin access denied",
      });
    }

    // ------------------------------------------------------
    // FIND ADMIN
    // ------------------------------------------------------

    const user = await User.findById(decoded.id).select(
      "-password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Admin account not found",
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
    // SUCCESS
    // ------------------------------------------------------

    return res.json({
      success: true,
      user,
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
// ADMIN LOGOUT
// POST /api/admin/auth/logout
// ==========================================================

router.post("/logout", async (req, res) => {
  try {
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