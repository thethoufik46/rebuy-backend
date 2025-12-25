import express from "express";
import BikeOrder from "../models/bike_order_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

/* ===============================
   CREATE ORDER (USER)
================================ */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { bikeId } = req.body;

    const exists = await BikeOrder.findOne({
      user: req.userId,
      bike: bikeId,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "You already ordered this bike",
      });
    }

    const order = await BikeOrder.create({
      user: req.userId,
      bike: bikeId,
      status: "booking",
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ===============================
   USER CANCEL REQUEST
   (ONLY SET STATUS = cancel)
================================ */
router.put("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const order = await BikeOrder.findOne({
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

    order.status = "cancel"; // ❗ only request
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
   ADMIN UPDATE STATUS (5 STATES)
================================ */
router.put("/:id/status", verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatus = [
      "booking",
      "verification",
      "advance",
      "delivery",
      "cancel",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const order = await BikeOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = status;
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ===============================
   ADMIN FINAL DELETE
   (ONLY AFTER CANCEL)
================================ */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const order = await BikeOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status !== "cancel") {
      return res.status(400).json({
        success: false,
        message: "Order must be cancelled before delete",
      });
    }

    await order.deleteOne();

    res.json({
      success: true,
      message: "Bike order deleted permanently",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ===============================
   USER – MY BIKE ORDERS
================================ */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const orders = await BikeOrder.find({ user: req.userId })
      .populate("bike", "brand model price bannerImage")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
