import mongoose from "mongoose";
import Wishlist from "../models/wishlist_model.js";

/* =================================================
   ❤️ TOGGLE WISHLIST (JWT USER)
   POST /api/wishlist/toggle/:carId
==================================================*/
export const toggleWishlist = async (req, res) => {
  try {
    const { carId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(carId)) {
      return res.status(400).json({ message: "Invalid car ID" });
    }

    const existing = await Wishlist.findOne({
      user: userId,
      car: carId,
    });

    if (existing) {
      await existing.deleteOne();
      return res.status(200).json({
        success: true,
        action: "removed",
      });
    }

    await Wishlist.create({
      user: userId,
      car: carId,
    });

    res.status(200).json({
      success: true,
      action: "added",
    });
  } catch (error) {
    console.error("Wishlist toggle error:", error);
    res.status(500).json({
      success: false,
      message: "Wishlist toggle failed",
    });
  }
};

/* =================================================
   ❤️ GET USER WISHLIST (JWT USER)
   GET /api/wishlist
==================================================*/
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const items = await Wishlist.find({ user: userId })
      .populate({
        path: "car",
        populate: { path: "brand", select: "name logoUrl" },
      })
      .sort({ createdAt: -1 });

    const cars = items.map((i) => i.car).filter(Boolean);

    res.status(200).json({
      success: true,
      count: cars.length,
      wishlist: cars,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
    });
  }
};
