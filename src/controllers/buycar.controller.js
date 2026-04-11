// ======================= buycar.controller.js (FINAL UPDATED) =======================

import BuyCar from "../models/buycar_model.js";

/* 🟢 ADD BUY REQUEST (USER) */
export const addBuyCar = async (req, res) => {
  try {
    const {
      type,
      name,
      phone,
      location,
      description,
      audioNote,

      car,
      bike,
      property,
      electronics,
    } = req.body;

    if (!type) {
      return res.status(400).json({ message: "Type is required" });
    }

    // 🔥 TYPE VALIDATION
    if (type === "car" && !car?.model) {
      return res.status(400).json({ message: "Car details required" });
    }

    if (type === "bike" && !bike?.model) {
      return res.status(400).json({ message: "Bike details required" });
    }

    if (type === "property" && !property?.category) {
      return res.status(400).json({ message: "Property details required" });
    }

    if (type === "electronics" && !electronics?.category) {
      return res.status(400).json({ message: "Electronics details required" });
    }

    const newRequest = new BuyCar({
      type,
      name,
      phone,
      location,
      description,
      audioNote: audioNote || null,

      user: req.user._id,
      userId: req.user._id.toString(),

      car,
      bike,
      property,
      electronics,
    });

    await newRequest.save();

    res.status(201).json({
      success: true,
      message: "Request submitted successfully",
      data: newRequest,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 GET MY REQUESTS */
export const getMyBuyCars = async (req, res) => {
  try {
    const cars = await BuyCar.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      count: cars.length,
      cars,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 UPDATE MY REQUEST */
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

    res.json({
      success: true,
      car,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 DELETE MY REQUEST */
export const deleteMyBuyCar = async (req, res) => {
  try {
    const car = await BuyCar.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!car) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({
      success: true,
      message: "Request deleted",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔵 GET ALL REQUESTS (ADMIN) */
export const getBuyCars = async (req, res) => {
  try {
    const cars = await BuyCar.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: cars.length,
      cars,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔵 GET SINGLE REQUEST */
export const getBuyCarById = async (req, res) => {
  try {
    const car = await BuyCar.findById(req.params.id).populate(
      "user",
      "name email"
    );

    if (!car) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({
      success: true,
      car,
    });
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

    if (!car) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({
      success: true,
      car,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔴 DELETE REQUEST (ADMIN) */
export const deleteBuyCar = async (req, res) => {
  try {
    const car = await BuyCar.findByIdAndDelete(req.params.id);

    if (!car) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};