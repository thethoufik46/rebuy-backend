import express from "express";
import BikeOrder from "../models/order_bike_model.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   CREATE BIKE ORDER
   DEFAULT STATUS = BOOKING
========================= */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { bikeId } = req.body;

    if (!bikeId) {
      return res.status(400).json({ message: "Bike ID required" });
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

/* =========================
   UPDATE BIKE ORDER STATUS
========================= */
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
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await BikeOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("user", "name phone email")
      .populate("bike", "brand model price");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================
   GET LOGGED-IN USER BIKE ORDERS
========================= */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const orders = await BikeOrder.find({ user: req.userId })
      .populate("bike", "brand model price")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
