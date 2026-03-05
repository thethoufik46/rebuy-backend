import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/user_model.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    let { name, phone, email, password, category, district, location, address } =
      req.body;

    phone = phone?.toString().trim();

    if (!name || !phone || !password || !category || !district) {
      return res.status(400).json({
        success: false,
        message:
          "Required fields missing (name, phone, password, category, district)",
      });
    }

    const query = [{ phone: { $in: [phone] } }];

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
      phone: [phone], // ✅ ARRAY
      email: email ? email.toLowerCase() : undefined,
      password: hashedPassword,
      role: "user",
      category,
      district,
      location: location || "NA",
      address: address || "NA",
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({
      success: true,
      token,
      user: safeUser,
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
        { phone: { $in: [identifier] } }, // ✅ ARRAY FIX
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

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({
      success: true,
      token,
      user: safeUser,
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
    let { name, email, district, location, address } = req.body;

    email = email?.toString().toLowerCase().trim();

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (district) user.district = district;
    if (location) user.location = location;
    if (address) user.address = address;

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({
      success: true,
      user: safeUser,
    });
  } catch (err) {
    console.log("UPDATE ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message || "Update failed",
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

    const user = await User.findOne({
      phone: { $in: [phone] }, // ✅ FIX
    });

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

/* ================= ADMIN GET USERS ================= */
router.get("/admin/users", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins only",
      });
    }

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

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

/* ================= ADMIN UPDATE USER ================= */
router.put("/admin/users/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins only",
      });
    }

    const { name, phone, email, category, district, location, address } =
      req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name) user.name = name;
    if (phone) user.phone = [phone.toString().trim()]; // ✅ ARRAY FIX
    if (email) user.email = email.toLowerCase().trim();
    if (category) user.category = category;
    if (district) user.district = district;
    if (location) user.location = location;
    if (address) user.address = address;

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({
      success: true,
      user: safeUser,
    });
  } catch (err) {
    console.log("ADMIN UPDATE ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: err.message || "Update failed",
    });
  }
});

/* ================= ADMIN DELETE USER ================= */
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

    const user = await User.findOne({
      phone: { $in: [phone] }, // ✅ FIX
    });

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
    console.log("RESET PASSWORD ERROR 👉", err);

    res.status(500).json({
      success: false,
      message: "Reset failed",
    });
  }
});

export default router;