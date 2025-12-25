import express from "express";
import BikeOrder from "../models/bike_order_model.js";
import { verifyToken } from "../middleware/auth.js";


const router = express.Router();

/* CREATE BIKE ORDER */
router.post("/", verifyToken, async (req, res) => {
  const { bikeId } = req.body;

  const order = await BikeOrder.create({
    user: req.userId,
    bike: bikeId,
    status: "booking",
  });

  res.status(201).json({ success: true, order });
});

/* UPDATE STATUS */
router.put("/:id/status", verifyToken, async (req, res) => {
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
    .populate({
      path: "bike",
      populate: { path: "brand", select: "name" },
    });

  res.json({ success: true, order });
});

/* GET MY BIKE ORDERS ✅ IMPORTANT */
router.get("/my", verifyToken, async (req, res) => {
  const orders = await BikeOrder.find({ user: req.userId })
    .populate({
      path: "bike",
      populate: { path: "brand", select: "name" },
    })
    .sort({ createdAt: -1 });

  res.json({ success: true, orders });
});

export default router;
