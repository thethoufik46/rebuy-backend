import express from "express";
import Order from "../models/order_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

/* ===============================
   CREATE ORDER (USER)
================================ */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { carId } = req.body;

    const exists = await Order.findOne({
      user: req.userId,
      car: carId,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "You already ordered this car",
      });
    }

    const order = await Order.create({
      user: req.userId,
      car: carId,
      status: "booking",
      isUserVisible: true,
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ===============================
   USER – MY CAR ORDERS
   (VISIBLE ONLY)
================================ */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.userId,
      isUserVisible: true,
    })
      .populate("car", "brand model price bannerImage")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ===============================
   ADMIN – GET ALL CAR ORDERS
================================ */
router.get("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("car", "brand model price bannerImage")
      .populate("user", "name phone email")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ===============================
   USER CANCEL REQUEST
================================ */
router.put("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status === "delivery") {
      return res.status(400).json({
        success: false,
        message: "Delivered order cannot be cancelled",
      });
    }

    order.status = "cancel_requested";
    await order.save();

    res.json({
      success: true,
      message: "Cancel request sent. Waiting for admin approval",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ===============================
   ADMIN UPDATE STATUS
================================ */
router.put("/:id/status", verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatus = [
      "booking",
      "verification",
      "advance",
      "delivery",
      "cancelled",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = status;

    // 🔥 CANCEL APPROVED → USER SIDE DELETE
    if (status === "cancelled") {
      order.isUserVisible = false;
    }

    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ===============================
   ADMIN HARD DELETE (OPTIONAL)
   ONLY AFTER CANCELLED
================================ */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status !== "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Only cancelled orders can be deleted",
      });
    }

    await order.deleteOne();

    res.json({
      success: true,
      message: "Car order permanently deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
