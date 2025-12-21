import express from "express";
import Order from "../models/order_model.js";
import { verifyToken } from "../middleware/auth.js";


const router = express.Router();

/* CREATE ORDER (DEFAULT = BOOKING) */
router.post("/", verifyToken, async (req, res) => {
  const { carId } = req.body;

  const order = await Order.create({
    user: req.userId,
    car: carId,
    status: "booking",
  });

  res.status(201).json({ success: true, order });
});

/* UPDATE ORDER STATUS */
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

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  )
    .populate("user", "name phone email")
    .populate("car", "brand model price");

  res.json({ success: true, order });
});

/* GET LOGGED-IN USER ORDERS */
router.get("/my", verifyToken, async (req, res) => {
  const orders = await Order.find({ user: req.userId })
    .populate("car", "brand model price")
    .sort({ createdAt: -1 });

  res.json({ success: true, orders });
});

export default router;
