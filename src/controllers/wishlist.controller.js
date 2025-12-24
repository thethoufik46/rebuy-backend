import mongoose from "mongoose";
import Wishlist from "../models/wishlist_model.js";
import Car from "../models/car_model.js";
import Bike from "../models/bike_model.js";

/* ❤️ TOGGLE WISHLIST */
export const toggleWishlist = async (req, res) => {
  try {
    const { itemId, itemType } = req.body;
    const userId = req.user._id;

    if (
      !mongoose.Types.ObjectId.isValid(itemId) ||
      !["Car", "Bike"].includes(itemType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid itemId or itemType",
      });
    }

    // 🔍 validate item exists
    if (itemType === "Car") {
      const car = await Car.findById(itemId);
      if (!car) return res.status(404).json({ message: "Car not found" });
    }

    if (itemType === "Bike") {
      const bike = await Bike.findById(itemId);
      if (!bike) return res.status(404).json({ message: "Bike not found" });
    }

    const existing = await Wishlist.findOne({
      user: userId,
      itemId,
      itemType,
    });

    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, action: "removed" });
    }

    await Wishlist.create({
      user: userId,
      itemId,
      itemType,
    });

    res.json({ success: true, action: "added" });
  } catch (err) {
    console.error("🔥 Wishlist toggle error:", err);
    res.status(500).json({
      success: false,
      message: "Wishlist toggle failed",
    });
  }
};

/* ❤️ GET WISHLIST */
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const items = await Wishlist.find({ user: userId })
      .populate({
        path: "itemId",
        populate: { path: "brand", select: "name logoUrl" },
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      wishlist: items.map((i) => ({
        ...i.itemId.toObject(),
        _wishlistType: i.itemType, // 🔥 frontend use
      })),
    });
  } catch (err) {
    console.error("Get wishlist error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
    });
  }
};
