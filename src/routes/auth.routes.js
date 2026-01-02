// routes/auth_routes.js

import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user_model.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* ---------------- REGISTER ---------------- */
router.post("/register", async (req, res) => {
  try {
    const { name, phone, email, password, category, location, address } =
      req.body;

    if (!name || !phone || !email || !password || !category) {
      return res.status(400).json({
        message: "Name, phone, email, password and category are required",
      });
    }

    const allowedCategories = ["buyer", "seller", "driver"];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category selected" });
    }

    // ✅ check email OR phone already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email or phone",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      phone,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user",
      category,
      location,
      address,
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({ message: "Error registering user" });
  }
});

/* ---------------- LOGIN (EMAIL / PHONE) ---------------- */
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Email / Phone and password are required",
      });
    }

    // ✅ find by email OR phone
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

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
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Error logging in" });
  }
});

/* ---------------- GET LOGGED-IN USER ---------------- */
router.get("/me", verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

/* ---------------- UPDATE LOGGED-IN USER ---------------- */
router.put("/me", verifyToken, async (req, res) => {
  const { name, phone, location, address } = req.body;

  const user = await User.findByIdAndUpdate(
    req.userId,
    { name, phone, location, address },
    { new: true }
  ).select("-password");

  res.json({
    success: true,
    user,
  });
});

/* ---------------- DELETE LOGGED-IN USER ---------------- */
router.delete("/me", verifyToken, async (req, res) => {
  await User.findByIdAndDelete(req.userId);

  res.json({
    success: true,
    message: "User profile deleted",
  });
});

export default router;
