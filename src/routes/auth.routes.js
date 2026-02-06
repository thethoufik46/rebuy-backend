import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/user_model.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* ================= REGISTER ================= */
/* ================= REGISTER (FIXED) ================= */
router.post("/register", async (req, res) => {
  try {
    const { name, phone, email, password, category, location, address } =
      req.body;

    if (!name || !phone || !password || !category) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const query = [{ phone }];
    if (email) query.push({ email: email.toLowerCase() });

    const existingUser = await User.findOne({ $or: query });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      phone,
      email: email ? email.toLowerCase() : undefined,
      password: hashedPassword,
      category,
      location,
      address,
    });

    // ✅ TOKEN GENERATE (SAME AS LOGIN)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        category: user.category,
        location: user.location,
        address: user.address,
      },
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Credentials required",
      });
    }

    const user = await User.findOne({
      $or: [{ phone: identifier }, { email: identifier.toLowerCase() }],
    });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        category: user.category,
        location: user.location,
        address: user.address,
        profileImage: user.profileImage,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

/* ================= GET ME ================= */
router.get("/me", verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

/* ================= UPDATE PROFILE ================= */
router.put("/me", verifyToken, async (req, res) => {
  try {
    const { name, phone, email, location, address } = req.body;

    const update = {};
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (email) update.email = email.toLowerCase();
    if (location) update.location = location;
    if (address) update.address = address;

    const user = await User.findByIdAndUpdate(req.userId, update, {
      new: true,
    }).select("-password");

    res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

/* ================= FORGOT PASSWORD ================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    console.log("RESET LINK:", resetLink);

    res.json({
      success: true,
      message: "Reset link generated",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Forgot password failed",
    });
  }
});

/* ================= RESET PASSWORD ================= */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Token invalid or expired" });

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Reset failed",
    });
  }
});

/* ================= CHANGE PASSWORD ================= */
router.put("/change-password", verifyToken, async (req, res) => {
  try {
    const { newPassword } = req.body;

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
  } catch {
    res.status(500).json({
      success: false,
      message: "Change failed",
    });
  }
});

export default router;
