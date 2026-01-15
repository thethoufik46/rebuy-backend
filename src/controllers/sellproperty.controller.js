// ======================= sellproperty.controller.js =======================
import SellProperty from "../models/sellproperty_model.js";

/* 🟢 ADD SELL PROPERTY (USER) */
export const addSellProperty = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    const property = new SellProperty({
      ...req.body,
      user: req.user._id,               // 🔗 reference
      userId: req.user._id.toString(),  // 🔑 explicit userId field
      image: req.file.path,
    });

    await property.save();

    res.status(201).json({
      success: true,
      message: "Sell property request submitted",
      property,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 GET MY SELL PROPERTIES (USER) */
export const getMySellProperties = async (req, res) => {
  try {
    const properties = await SellProperty.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 UPDATE MY SELL PROPERTY (USER) */
export const updateMySellProperty = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = req.file.path;
    }

    const property = await SellProperty.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true }
    );

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 DELETE MY SELL PROPERTY (USER) */
export const deleteMySellProperty = async (req, res) => {
  try {
    const property = await SellProperty.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ success: true, message: "Sell property deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔵 GET ALL SELL PROPERTIES (ADMIN) */
export const getSellProperties = async (req, res) => {
  try {
    const properties = await SellProperty.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔵 GET SINGLE SELL PROPERTY (ADMIN) */
export const getSellPropertyById = async (req, res) => {
  try {
    const property = await SellProperty.findById(req.params.id).populate(
      "user",
      "name email"
    );

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟡 UPDATE STATUS (ADMIN) */
export const updateSellPropertyStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const property = await SellProperty.findByIdAndUpdate(
      req.params.id,
      { status, adminNote },
      { new: true }
    );

    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔴 DELETE SELL PROPERTY (ADMIN) */
export const deleteSellProperty = async (req, res) => {
  try {
    await SellProperty.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Sell property deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
