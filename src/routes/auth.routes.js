import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/user_model.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    let { name, phone, email, password, category, location, address } =
      req.body;

    phone = phone?.toString().trim();
    email = email?.toString().toLowerCase().trim();

    if (!name || !phone || !password || !category) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const query = [{ phone }];
    if (email) query.push({ email });

    const existingUser = await User.findOne({ $or: query });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password too short",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      phone,
      email: email || undefined,
      password: hashedPassword,
      role: "user",
      category,
      location: location || "NA",
      address: address || "NA",
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    console.error("REGISTER ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message || "Registration failed",
    });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    let { identifier, password } = req.body;

    identifier = identifier?.toString().trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Credentials required",
      });
    }

    const user = await User.findOne({
      $or: [
        { phone: identifier },
        { email: identifier.toLowerCase() },
      ],
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    console.log("LOGIN ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

/* ================= GET ME ================= */
router.get("/me", verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

/* ================= UPDATE PROFILE ================= */
router.put("/me", verifyToken, async (req, res) => {
  try {
    let { name, phone, email, location, address } = req.body;

    phone = phone?.toString().trim();
    email = email?.toString().toLowerCase().trim();

    const update = {};

    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (email) update.email = email;
    if (location) update.location = location;
    if (address) update.address = address;

    const user = await User.findByIdAndUpdate(req.userId, update, {
      new: true,
    }).select("-password");

    res.json({ success: true, user });
  } catch (err) {
    console.log("UPDATE ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
});

/* ================= CHANGE PASSWORD ================= */
router.put("/change-password", verifyToken, async (req, res) => {
  try {
    let { newPassword } = req.body;

    newPassword = newPassword?.toString();

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password too short",
      });
    }

    const user = await User.findById(req.userId);

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    res.json({
      success: true,
      message: "Password updated",
    });
  } catch (err) {
    console.log("PASSWORD ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Change failed",
    });
  }
});

/* ================= FORGOT REQUEST ================= */
router.post("/forgot-request", async (req, res) => {
  try {
    console.log("BODY 👉", req.body);

    let { phone, newPassword } = req.body;

    phone = phone?.toString().trim();
    newPassword = newPassword?.toString();

    if (!phone || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Phone & Password required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password too short",
      });
    }

    const user = await User.findOne({ phone });

    console.log("USER 👉", user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.forgotRequest = true;
    user.forgotRequestAt = Date.now();
    user.requestedPassword = newPassword;

    await user.save();

    res.json({
      success: true,
      message: "Request sent to admin",
    });
  } catch (err) {
    console.log("FORGOT ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Request failed",
    });
  }
});

/* ================= ADMIN RESET PASSWORD ================= */
router.put("/admin/reset-password", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins only",
      });
    }

    let { phone, newPassword } = req.body;

    phone = phone?.toString().trim();
    newPassword = newPassword?.toString();

    if (!phone || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Phone & password required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password too short",
      });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.forgotRequest = false;
    user.forgotRequestAt = null;
    user.requestedPassword = null;

    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.log("RESET ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Reset failed",
    });
  }
});

export default router;
