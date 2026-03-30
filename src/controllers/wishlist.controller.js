import mongoose from "mongoose";
import Wishlist from "../models/wishlist_model.js";
import Car from "../models/car_model.js";
import Bike from "../models/bike_model.js";

/* ==============================
   TOGGLE WISHLIST
============================== */
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

    const existing = await Wishlist.findOne({
      user: userId,
      itemId,
      itemType,
    });

    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, action: "removed" });
    }

    await Wishlist.create({ user: userId, itemId, itemType });

    res.json({ success: true, action: "added" });
  } catch (err) {
    console.error("Wishlist toggle error:", err);
    res.status(500).json({
      success: false,
      message: "Wishlist toggle failed",
    });
  }
};

/* ==============================
   GET WISHLIST (FIXED)
============================== */
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const items = await Wishlist.find({ user: userId }).sort({
      createdAt: -1,
    });

    const results = [];

    for (const w of items) {
      let data = null;

      if (w.itemType === "Car") {
        data = await Car.findById(w.itemId).populate("brand", "name logoUrl");
      }

      if (w.itemType === "Bike") {
        data = await Bike.findById(w.itemId).populate("brand", "name logoUrl");
      }

      if (data) {
        results.push({
          ...data.toObject(),
          _wishlistType: w.itemType,
        });
      }
    }

    res.json({
      success: true,
      wishlist: results,
    });
  } catch (err) {
    console.error("Get wishlist error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
    });
  }
};
