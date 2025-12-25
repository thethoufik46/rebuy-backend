import express from "express";
import BikeOrder from "../models/bike_order_model.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* ======================================================
   CREATE BIKE ORDER (ONE USER → ONE BIKE → ONE ORDER)
====================================================== */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { bikeId } = req.body;

    if (!bikeId) {
      return res.status(400).json({
        success: false,
        message: "Bike ID is required",
      });
    }

    // 🔒 CHECK EXISTING ORDER
    const existingOrder = await BikeOrder.findOne({
      user: req.userId,
      bike: bikeId,
    });

    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: "You have already ordered this bike",
        order: existingOrder,
      });
    }

    const order = await BikeOrder.create({
      user: req.userId,
      bike: bikeId,
      status: "booking",
    });

    res.status(201).json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("Create Bike Order Error:", err);

    // 🔐 Mongo unique index error (extra safety)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Bike already ordered by this user",
      });
    }

    res.status(500).json({
      success: false,
      message: "Create bike order failed",
    });
  }
});

/* ======================================================
   UPDATE BIKE ORDER STATUS
====================================================== */
router.put("/:id/status", verifyToken, async (req, res) => {
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

    const order = await BikeOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("user", "name phone email")
      .populate({
        path: "bike",
        populate: { path: "brand", select: "name" },
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Bike order not found",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("Update Bike Order Error:", err);
    res.status(500).json({
      success: false,
      message: "Update bike order failed",
    });
  }
});

/* ======================================================
   GET LOGGED-IN USER BIKE ORDERS
====================================================== */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const orders = await BikeOrder.find({ user: req.userId })
      .populate({
        path: "bike",
        populate: { path: "brand", select: "name" },
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error("Get Bike Orders Error:", err);
    res.status(500).json({
      success: false,
      message: "Fetch bike orders failed",
    });
  }
});

export default router;
