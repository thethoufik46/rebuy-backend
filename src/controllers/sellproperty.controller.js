// ======================= controllers/sellproperty.controller.js =======================
import SellProperty from "../models/sellproperty_model.js";

/* ADD */
export const addSellProperty = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    const property = new SellProperty({
      ...req.body,
      price: Number(req.body.price),
      user: req.user._id,
      userId: req.user._id.toString(),
      image: `/uploads/${req.file.filename}`,
    });

    await property.save();
    res.status(201).json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* MY */
export const getMySellProperties = async (req, res) => {
  const properties = await SellProperty.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, properties });
};

/* UPDATE */
export const updateMySellProperty = async (req, res) => {
  const data = { ...req.body };
  if (req.file) data.image = `/uploads/${req.file.filename}`;

  const property = await SellProperty.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    data,
    { new: true }
  );

  if (!property) return res.status(404).json({ message: "Not found" });
  res.json({ success: true, property });
};

/* DELETE */
export const deleteMySellProperty = async (req, res) => {
  await SellProperty.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  res.json({ success: true });
};

/* ADMIN */
export const getSellProperties = async (req, res) => {
  const properties = await SellProperty.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 });
  res.json({ success: true, properties });
};

export const getSellPropertyById = async (req, res) => {
  const property = await SellProperty.findById(req.params.id).populate(
    "user",
    "name email"
  );
  if (!property) return res.status(404).json({ message: "Not found" });
  res.json({ success: true, property });
};

export const updateSellPropertyStatus = async (req, res) => {
  const property = await SellProperty.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  res.json({ success: true, property });
};

export const deleteSellProperty = async (req, res) => {
  await SellProperty.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};
