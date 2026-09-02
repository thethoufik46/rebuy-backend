// ============================================================
// COMMON SEARCH CONTROLLER
// RE2BUY
// ============================================================

import Car from "../models/car_model.js";
import Bike from "../models/bike_model.js";
import Electronics from "../models/electronics_model.js";
import Property from "../models/property_model.js";

// ============================================================
// CAR
// ============================================================

import CarBrand from "../models/car/brand/car_brand_model.js";
import CarModel from "../models/car/model/car_model_model.js";
import CarVariant from "../models/car/variant/car_variant_model.js";

// ============================================================
// BIKE
// ============================================================

import BikeBrand from "../models/bike/brand/bike_brand_model.js";
import BikeModel from "../models/bike_model.js";

// ============================================================
// COMMON SEARCH
// GET /api/search?q=BMW
// ============================================================

export const commonSearch = async (req, res) => {
  try {
    // ==========================================================
    // SEARCH QUERY
    // ==========================================================

    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
        results: [],
      });
    }

    // ==========================================================
    // SAFE REGEX
    // ==========================================================

    const escapedQuery = q.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(
      escapedQuery,
      "i"
    );

    // ==========================================================
    // CAR SEARCH
    // ==========================================================

    // ----------------------------------------------------------
    // 1. SEARCH CAR BRANDS
    // ----------------------------------------------------------

    const carBrands = await CarBrand.find({
      name: regex,
    })
      .select("_id name logoUrl")
      .lean();

    const carBrandIds = carBrands.map(
      (brand) => brand._id
    );

    // ----------------------------------------------------------
    // 2. SEARCH CAR MODELS
    // ----------------------------------------------------------

    const carModels = await CarModel.find({
      $or: [
        {
          title: regex,
        },

        ...(carBrandIds.length
          ? [
              {
                brand: {
                  $in: carBrandIds,
                },
              },
            ]
          : []),
      ],
    })
      .select(
        "_id brand title imageUrl"
      )
      .lean();

    const carModelIds = carModels.map(
      (model) => model._id
    );

    // ----------------------------------------------------------
    // 3. SEARCH CAR VARIANTS
    // ----------------------------------------------------------

    const carVariants = await CarVariant.find({
      $or: [
        {
          title: regex,
        },

        ...(carModelIds.length
          ? [
              {
                carModel: {
                  $in: carModelIds,
                },
              },
            ]
          : []),
      ],
    })
      .select(
        "_id carModel title imageUrl"
      )
      .lean();

    const carVariantIds = carVariants.map(
      (variant) => variant._id
    );

    // ----------------------------------------------------------
    // 4. SEARCH CARS
    // ----------------------------------------------------------

    const cars = await Car.find({
      status: "available",

      $or: [
        {
          model: regex,
        },

        {
          description: regex,
        },

        {
          district: regex,
        },

        {
          city: regex,
        },

        ...(carBrandIds.length
          ? [
              {
                brand: {
                  $in: carBrandIds,
                },
              },
            ]
          : []),

        ...(carVariantIds.length
          ? [
              {
                variant: {
                  $in: carVariantIds,
                },
              },
            ]
          : []),
      ],
    })
      .populate(
        "brand",
        "name logoUrl"
      )
      .populate(
        "variant",
        "title imageUrl carModel"
      )
      .limit(50)
      .lean();

    // ==========================================================
    // BIKE SEARCH
    // ==========================================================

    // ----------------------------------------------------------
    // 1. SEARCH BIKE BRANDS
    // ----------------------------------------------------------

    const bikeBrands = await BikeBrand.find({
      name: regex,
    })
      .select(
        "_id name logoUrl"
      )
      .lean();

    const bikeBrandIds = bikeBrands.map(
      (brand) => brand._id
    );

    // ----------------------------------------------------------
    // 2. SEARCH BIKE MODELS
    // ----------------------------------------------------------

    const bikeModels = await BikeModel.find({
      $or: [
        {
          title: regex,
        },

        ...(bikeBrandIds.length
          ? [
              {
                brand: {
                  $in: bikeBrandIds,
                },
              },
            ]
          : []),
      ],
    })
      .select(
        "_id title brand imageUrl"
      )
      .lean();

    const bikeModelIds = bikeModels.map(
      (model) => model._id
    );

    // ----------------------------------------------------------
    // 3. SEARCH BIKES
    // ----------------------------------------------------------

    const bikes = await Bike.find({
      status: "available",

      $or: [
        {
          variant: regex,
        },

        {
          description: regex,
        },

        {
          district: regex,
        },

        {
          city: regex,
        },

        ...(bikeBrandIds.length
          ? [
              {
                brand: {
                  $in: bikeBrandIds,
                },
              },
            ]
          : []),

        ...(bikeModelIds.length
          ? [
              {
                model: {
                  $in: bikeModelIds,
                },
              },
            ]
          : []),
      ],
    })
      .populate(
        "brand",
        "name logoUrl"
      )
      .populate(
        "model",
        "title imageUrl brand"
      )
      .limit(50)
      .lean();

    // ==========================================================
    // ELECTRONICS SEARCH
    // ==========================================================

    const electronics =
      await Electronics.find({
        status: "available",

        $or: [
          {
            category: regex,
          },

          {
            title: regex,
          },

          {
            description: regex,
          },

          {
            district: regex,
          },

          {
            city: regex,
          },
        ],
      })
        .limit(50)
        .lean();

    // ==========================================================
    // PROPERTY SEARCH
    // ==========================================================

    const properties =
      await Property.find({
        status: "available",

        $or: [
          {
            mainType: regex,
          },

          {
            category: regex,
          },

          {
            bedrooms: regex,
          },

          {
            description: regex,
          },

          {
            district: regex,
          },

          {
            city: regex,
          },
        ],
      })
        .limit(50)
        .lean();

    // ==========================================================
    // NORMALIZE ALL RESULTS
    // ==========================================================

    const results = [
      // --------------------------------------------------------
      // CARS
      // --------------------------------------------------------

      ...cars.map((item) => ({
        type: "car",
        id: item._id,
        item,
      })),

      // --------------------------------------------------------
      // BIKES
      // --------------------------------------------------------

      ...bikes.map((item) => ({
        type: "bike",
        id: item._id,
        item,
      })),

      // --------------------------------------------------------
      // ELECTRONICS
      // --------------------------------------------------------

      ...electronics.map((item) => ({
        type: "electronics",
        id: item._id,
        item,
      })),

      // --------------------------------------------------------
      // PROPERTIES
      // --------------------------------------------------------

      ...properties.map((item) => ({
        type: "property",
        id: item._id,
        item,
      })),
    ];

    // ==========================================================
    // REMOVE DUPLICATES
    // ==========================================================

    const uniqueResults = [];

    const seen = new Set();

    for (const result of results) {
      const key = `${result.type}_${result.id}`;

      if (!seen.has(key)) {
        seen.add(key);

        uniqueResults.push(result);
      }
    }

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return res.status(200).json({
      success: true,

      query: q,

      total: uniqueResults.length,

      results: uniqueResults,
    });
  } catch (error) {
    // ==========================================================
    // ERROR
    // ==========================================================

    console.error(
      "COMMON SEARCH ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message: "Common search failed",

      error: error.message,

      results: [],
    });
  }
};