import BuyProperty from "../models/buyproperty_model.js";

/* 🟢 ADD BUY PROPERTY (USER) */
export const addBuyProperty = async (req, res) => {
  try {
    const property = new BuyProperty({
      ...req.body,
      user: req.user._id,
      userId: req.user._id.toString(),
    });

    await property.save();

    res.status(201).json({
      success: true,
      message: "Buy property request submitted",
      property,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🟢 GET MY BUY PROPERTIES (USER) */
export const getMyBuyProperties = async (req, res) => {
  try {
    const properties = await BuyProperty.find({
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

/* 🟢 UPDATE MY BUY PROPERTY (USER) */
export const updateMyBuyProperty = async (req, res) => {
  try {
    const property = await BuyProperty.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
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

/* 🟢 DELETE MY BUY PROPERTY (USER) */
export const deleteMyBuyProperty = async (req, res) => {
  try {
    const property = await BuyProperty.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({
      success: true,
      message: "Buy property request deleted",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔵 GET ALL BUY PROPERTIES (ADMIN) */
export const getBuyProperties = async (req, res) => {
  try {
    const properties = await BuyProperty.find()
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

/* 🔵 GET SINGLE BUY PROPERTY (ADMIN) */
export const getBuyPropertyById = async (req, res) => {
  try {
    const property = await BuyProperty.findById(req.params.id).populate(
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
export const updateBuyPropertyStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const property = await BuyProperty.findByIdAndUpdate(
      req.params.id,
      { status, adminNote },
      { new: true }
    );

    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔴 DELETE PROPERTY (ADMIN) */
export const deleteBuyProperty = async (req, res) => {
  try {
    await BuyProperty.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Buy property deleted",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
