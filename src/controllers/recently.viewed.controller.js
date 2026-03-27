import mongoose from "mongoose";
import RecentlyViewed from "../models/recently_viewed_model.js";

import Car from "../models/car_model.js";
import Bike from "../models/bike_model.js";
import Property from "../models/property_model.js";

/* =====================================================
   ➕ ADD RECENT ITEM
===================================================== */
export const addRecentlyViewed = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId, itemType } = req.body;

    if (!itemId || !itemType) {
      return res.status(400).json({
        success: false,
        message: "itemId and itemType required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid itemId",
      });
    }

    let data = await RecentlyViewed.findOne({ userId });

    if (!data) {
      data = new RecentlyViewed({ userId, items: [] });
    }

    /// 🔥 REMOVE DUPLICATE
    data.items = data.items.filter(
      (i) => i.itemId.toString() !== itemId.toString()
    );

    /// 🔥 ADD TO TOP
    data.items.unshift({
      itemId,
      itemType,
      viewedAt: new Date(),
    });

    /// 🔥 LIMIT 10
    data.items = data.items.slice(0, 10);

    await data.save();

    res.json({
      success: true,
      items: data.items,
    });
  } catch (err) {
    console.error("ADD RECENT ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   📥 GET RECENT ITEMS (CAR + BIKE + PROPERTY)
===================================================== */
export const getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.userId;

    const data = await RecentlyViewed.findOne({ userId });

    if (!data || data.items.length === 0) {
      return res.json({
        success: true,
        items: [],
      });
    }

    const items = data.items;

    /// 🔥 SPLIT IDS
    const carIds = items
      .filter((i) => i.itemType === "car")
      .map((i) => i.itemId);

    const bikeIds = items
      .filter((i) => i.itemType === "bike")
      .map((i) => i.itemId);

    const propertyIds = items
      .filter((i) => i.itemType === "property")
      .map((i) => i.itemId);

    /// 🔥 FETCH ALL IN PARALLEL
    const [cars, bikes, properties] = await Promise.all([
      Car.find({ _id: { $in: carIds } }),
      Bike.find({ _id: { $in: bikeIds } }),
      Property.find({ _id: { $in: propertyIds } }),
    ]);

    /// 🔥 MAP FOR FAST ACCESS
    const carMap = new Map(cars.map((c) => [c._id.toString(), c]));
    const bikeMap = new Map(bikes.map((b) => [b._id.toString(), b]));
    const propertyMap = new Map(
      properties.map((p) => [p._id.toString(), p])
    );

    /// 🔥 PRESERVE ORDER (VERY IMPORTANT)
    const finalItems = items
      .map((i) => {
        const id = i.itemId.toString();

        if (i.itemType === "car" && carMap.has(id)) {
          return { type: "car", data: carMap.get(id) };
        }

        if (i.itemType === "bike" && bikeMap.has(id)) {
          return { type: "bike", data: bikeMap.get(id) };
        }

        if (i.itemType === "property" && propertyMap.has(id)) {
          return { type: "property", data: propertyMap.get(id) };
        }

        return null;
      })
      .filter(Boolean);

    res.json({
      success: true,
      items: finalItems,
    });
  } catch (err) {
    console.error("GET RECENT ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};