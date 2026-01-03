// ======================= buycar.controller.js =======================
import BuyCar from "../models/buycar_model.js";

/* 🟢 ADD BUY CAR (USER) */
export const addBuyCar = async (req, res) => {
  try {
    const car = new BuyCar({
      ...req.body,
      user: req.user._id,
      userId: req.user._id.toString(),
    });

    await car.save();

    res.status(201).json({
      success: true,
      message: "Buy car request submitted",
      car,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 GET MY BUY CARS (USER) */
export const getMyBuyCars = async (req, res) => {
  try {
    const cars = await BuyCar.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({ success: true, count: cars.length, cars });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 UPDATE MY BUY CAR (USER) */
export const updateMyBuyCar = async (req, res) => {
  try {
    const car = await BuyCar.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );

    if (!car) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ success: true, car });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 DELETE MY BUY CAR (USER) */
export const deleteMyBuyCar = async (req, res) => {
  try {
    const car = await BuyCar.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!car) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ success: true, message: "Buy car request deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔵 GET ALL BUY CARS (ADMIN) */
export const getBuyCars = async (req, res) => {
  try {
    const cars = await BuyCar.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: cars.length, cars });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔵 GET SINGLE BUY CAR (ADMIN) */
export const getBuyCarById = async (req, res) => {
  try {
    const car = await BuyCar.findById(req.params.id).populate(
      "user",
      "name email"
    );

    if (!car) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ success: true, car });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟡 UPDATE STATUS (ADMIN) */
export const updateBuyCarStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const car = await BuyCar.findByIdAndUpdate(
      req.params.id,
      { status, adminNote },
      { new: true }
    );

    res.json({ success: true, car });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔴 DELETE BUY CAR (ADMIN) */
export const deleteBuyCar = async (req, res) => {
  try {
    await BuyCar.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Buy car deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
