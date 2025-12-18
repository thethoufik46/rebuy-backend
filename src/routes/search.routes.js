import express from "express";
import Car from "../models/car_model.js";

const router = express.Router();

/* =================================================
   🔍 SEARCH CARS (PUBLIC)
   GET /api/search/cars?query=swift
==================================================*/
router.get("/cars", async (req, res) => {
  try {
    const { query } = req.query;

    // Empty query → return empty array
    if (!query || query.trim() === "") {
      return res.status(200).json({
        success: true,
        count: 0,
        cars: [],
      });
    }

    const cars = await Car.aggregate([
      // Join brand collection
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },

      // Search conditions
      {
        $match: {
          $or: [
            { model: { $regex: query, $options: "i" } },
            { "brand.name": { $regex: query, $options: "i" } },
            { color: { $regex: query, $options: "i" } },
            { fuel: { $regex: query, $options: "i" } },
          ],
        },
      },

      // Sort newest first
      { $sort: { createdAt: -1 } },

      // Limit results for performance
      { $limit: 20 },
    ]);

    res.status(200).json({
      success: true,
      count: cars.length,
      cars,
    });
  } catch (error) {
    console.error("❌ Search Cars Error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching cars",
    });
  }
});

export default router;
