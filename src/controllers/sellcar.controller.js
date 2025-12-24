// ======================= sellcar.controller.js =======================
import SellCar from "../models/sellcar_model.js";

/* 🟢 ADD SELL CAR (USER) */
export const addSellCar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    const car = new SellCar({
      ...req.body,
      user: req.user._id,                 // 🔗 reference
      userId: req.user._id.toString(),    // 🔑 explicit userId field
      image: req.file.path,
    });

    await car.save();

    res.status(201).json({
      success: true,
      message: "Sell request submitted",
      car,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 GET MY SELL CARS (USER) */
export const getMySellCars = async (req, res) => {
  try {
    const cars = await SellCar.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({ success: true, count: cars.length, cars });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 UPDATE MY SELL CAR (USER) */
export const updateMySellCar = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = req.file.path;
    }

    const car = await SellCar.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
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

/* 🟢 DELETE MY SELL CAR (USER) */
export const deleteMySellCar = async (req, res) => {
  try {
    const car = await SellCar.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!car) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ success: true, message: "Sell car deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔵 GET ALL SELL CARS (ADMIN) */
export const getSellCars = async (req, res) => {
  try {
    const cars = await SellCar.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: cars.length, cars });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔵 GET SINGLE SELL CAR (ADMIN) */
export const getSellCarById = async (req, res) => {
  try {
    const car = await SellCar.findById(req.params.id).populate(
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
export const updateSellCarStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const car = await SellCar.findByIdAndUpdate(
      req.params.id,
      { status, adminNote },
      { new: true }
    );

    res.json({ success: true, car });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔴 DELETE SELL CAR (ADMIN) */
export const deleteSellCar = async (req, res) => {
  try {
    await SellCar.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Sell car deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
