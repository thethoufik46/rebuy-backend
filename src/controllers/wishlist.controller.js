import mongoose from "mongoose";
import Wishlist from "../models/wishlist_model.js";
import Car from "../models/car_model.js";
import Bike from "../models/bike_model.js";

/* =================================================
   ❤️ TOGGLE WISHLIST (CAR / BIKE)
   POST /api/wishlist/toggle
   body: { itemId, itemType }
==================================================*/
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
      return res.status(200).json({
        success: true,
        action: "removed",
      });
    }

    await Wishlist.create({
      user: userId,
      itemId,
      itemType,
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
   ❤️ GET USER WISHLIST (CAR + BIKE)
   GET /api/wishlist
==================================================*/
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const wishlistItems = await Wishlist.find({ user: userId }).sort({
      createdAt: -1,
    });

    const carIds = wishlistItems
      .filter((i) => i.itemType === "Car")
      .map((i) => i.itemId);

    const bikeIds = wishlistItems
      .filter((i) => i.itemType === "Bike")
      .map((i) => i.itemId);

    const cars = await Car.find({ _id: { $in: carIds } }).populate(
      "brand",
      "name logoUrl"
    );

    const bikes = await Bike.find({ _id: { $in: bikeIds } }).populate(
      "brand",
      "name logoUrl"
    );

    // 🔥 merge both (frontend will detect)
    const wishlist = [...cars, ...bikes];

    res.status(200).json({
      success: true,
      count: wishlist.length,
      wishlist,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
    });
  }
};
