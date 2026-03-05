import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/user_model.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    const { name, phone, email, password, category, district, address } =
      req.body;

    if (!name || !phone || !password || !category || !district) {
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

      role: "user",
      category,

      district,
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
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        category: user.category,
        district: user.district,
        address: user.address,
      },
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
    let { name, email, district, address } = req.body;

    email = email?.toString().toLowerCase().trim();

    const update = {};

    if (name) update.name = name;
    if (email) update.email = email;
    if (district) update.district = district;
    if (address) update.address = address;

    const user = await User.findByIdAndUpdate(req.userId, update, {
      new: true,
    }).select("-password");

    res.json({
      success: true,
      user,
    });
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

/* ================= DELETE MY ACCOUNT ================= */
router.delete("/me", verifyToken, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.userId);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.log("DELETE ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});

/* =========================================================
   ADMIN SECTION
========================================================= */

/* ================= GET ALL USERS ================= */
router.get("/admin/users", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins only",
      });
    }

    const users = await User.find().select("-password");

    res.json({
      success: true,
      users,
    });
  } catch (err) {
    console.log("ADMIN USERS ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Failed to load users",
    });
  }
});

/* ================= UPDATE USER ================= */
router.put("/admin/users/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins only",
      });
    }

    const { name, phone, email, category, district, address } = req.body;

    const update = {};

    if (name) update.name = name;
    if (phone) update.phone = phone.toString().trim();
    if (email) update.email = email.toLowerCase().trim();
    if (category) update.category = category;
    if (district) update.district = district;
    if (address) update.address = address;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.log("ADMIN UPDATE ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
});

/* ================= DELETE USER ================= */
router.delete("/admin/users/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins only",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User deleted",
    });
  } catch (err) {
    console.log("ADMIN DELETE ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});




/* ================= ADMIN RESET PASSWORD 🔥 ================= */
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

    /* ✅ HASH NEW PASSWORD */
    user.password = await bcrypt.hash(newPassword, 10);

    /* ✅ CLEAR FORGOT FLAGS */
    user.forgotRequest = false;
    user.forgotRequestAt = null;
    user.requestedPassword = null;

    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.log("RESET PASSWORD ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Reset failed",
    });
  }
});


export default router;
