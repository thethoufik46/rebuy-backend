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
    const {
      name,
      phone,
      email,
      password,
      category,
      location,
      address,
    } = req.body;

    if (!name || !phone || !email || !password || !category) {
      return res.status(400).json({
        message: "Name, phone, email, password and category are required",
      });
    }

    const allowedCategories = ["buyer", "seller", "driver"];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category selected" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      phone,
      email,
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
    res.status(500).json({ message: "Error registering user" });
  }
});

/* ---------------- LOGIN ---------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
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


export default router;
