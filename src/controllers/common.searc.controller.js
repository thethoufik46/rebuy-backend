import Car from "../models/car_model.js";
import Bike from "../models/bike_model.js";
import Electronics from "../models/electronics_model.js";
import Property from "../models/property_model.js";

import Brand from "../models/car_brand_model.js";
import Variant from "../models/car_variant_model.js";

import BikeBrand from "../models/bike_brand_model.js";
import BikeModel from "../models/bike_model.js";

// =====================================================Y
// COMMON SEARCH
// GET /api/search?q=BMW
// =====================================================

export const commonSearch = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
        results: [],
      });
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    // =================================================
    // CAR SEARCH
    // =================================================

    const carBrands = await Brand.find({
      name: regex,
    }).select("_id name logoUrl");

    const carBrandIds = carBrands.map((b) => b._id);

    const carVariants = await Variant.find({
      $or: [
        { title: regex },
        ...(carBrandIds.length
            ? [{ brand: { $in: carBrandIds } }]
            : []),
      ],
    }).select("_id title brand imageUrl");

    const carVariantIds = carVariants.map((v) => v._id);

    const cars = await Car.find({
      status: "available",
      $or: [
        { model: regex },
        { description: regex },
        { district: regex },
        { city: regex },
        ...(carBrandIds.length
            ? [{ brand: { $in: carBrandIds } }]
            : []),
        ...(carVariantIds.length
            ? [{ variant: { $in: carVariantIds } }]
            : []),
      ],
    })
      .populate("brand", "name logoUrl")
      .populate("variant", "title imageUrl")
      .limit(50)
      .lean();

    // =================================================
    // BIKE SEARCH
    // =================================================

    const bikeBrands = await BikeBrand.find({
      name: regex,
    }).select("_id name logoUrl");

    const bikeBrandIds = bikeBrands.map((b) => b._id);

    const bikeModels = await BikeModel.find({
      $or: [
        { title: regex },
        ...(bikeBrandIds.length
            ? [{ brand: { $in: bikeBrandIds } }]
            : []),
      ],
    }).select("_id title brand imageUrl");

    const bikeModelIds = bikeModels.map((m) => m._id);

    const bikes = await Bike.find({
      status: "available",
      $or: [
        { variant: regex },
        { description: regex },
        { district: regex },
        { city: regex },
        ...(bikeBrandIds.length
            ? [{ brand: { $in: bikeBrandIds } }]
            : []),
        ...(bikeModelIds.length
            ? [{ model: { $in: bikeModelIds } }]
            : []),
      ],
    })
      .populate("brand", "name logoUrl")
      .populate("model", "title imageUrl brand")
      .limit(50)
      .lean();

    // =================================================
    // ELECTRONICS SEARCH
    // =================================================

    const electronics = await Electronics.find({
      status: "available",
      $or: [
        { category: regex },
        { title: regex },
        { description: regex },
        { district: regex },
        { city: regex },
      ],
    })
      .limit(50)
      .lean();

    // =================================================
    // PROPERTY SEARCH
    // =================================================

    const properties = await Property.find({
      status: "available",
      $or: [
        { mainType: regex },
        { category: regex },
        { bedrooms: regex },
        { description: regex },
        { district: regex },
        { city: regex },
      ],
    })
      .limit(50)
      .lean();

    // =================================================
    // NORMALIZE ALL RESULTS
    // =================================================

    const results = [
      ...cars.map((item) => ({
        type: "car",
        id: item._id,
        item,
      })),

      ...bikes.map((item) => ({
        type: "bike",
        id: item._id,
        item,
      })),

      ...electronics.map((item) => ({
        type: "electronics",
        id: item._id,
        item,
      })),

      ...properties.map((item) => ({
        type: "property",
        id: item._id,
        item,
      })),
    ];

    // =================================================
    // REMOVE DUPLICATES
    // =================================================

    const uniqueResults = [];
    const seen = new Set();

    for (const result of results) {
      const key = `${result.type}_${result.id}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(result);
      }
    }

    return res.status(200).json({
      success: true,
      query: q,
      total: uniqueResults.length,
      results: uniqueResults,
    });
  } catch (error) {
    console.error("COMMON SEARCH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Common search failed",
      error: error.message,
      results: [],
    });
  }
};