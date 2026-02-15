import express from "express";
import mongoose from "mongoose";
import Car from "../models/car_model.js";
import Variant from "../models/car_variant_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { verifyTokenOptional } from "../middleware/verifyTokenOptional.js";
import uploadCar from "../middleware/uploadCar.js";
import {
  uploadCarImage,
  deleteCarImage,
} from "../utils/carUpload.js";
import { decryptSeller } from "../utils/sellerCrypto.js";

const router = express.Router();

/* =====================================================
   ✅ HELPER → SAFE ARRAY PARSER
===================================================== */
const parseArrayField = (field) => {
  if (!field) return [];

  if (typeof field === "string") {
    try {
      return JSON.parse(field); // ✅ CRITICAL FIX
    } catch {
      return [field];
    }
  }

  return Array.isArray(field) ? field : [field];
};

/* =====================================================
   ADD CAR (ADMIN)
===================================================== */
router.post(
  "/add",
  verifyToken,
  isAdmin,
  uploadCar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      let brand = parseArrayField(req.body.brand);
      let variant = parseArrayField(req.body.variant);

      if (!req.files?.banner) {
        return res.status(400).json({
          success: false,
          message: "Banner image required",
        });
      }

      if (!brand.length) {
        return res.status(400).json({
          success: false,
          message: "Brand required",
        });
      }

      /* ✅ BRAND VALIDATION */
      for (const b of brand) {
        if (!mongoose.Types.ObjectId.isValid(b)) {
          return res.status(400).json({
            success: false,
            message: "Invalid brand id",
          });
        }
      }

      /* ✅ VARIANT VALIDATION */
      for (const v of variant) {
        if (v && !mongoose.Types.ObjectId.isValid(v)) {
          return res.status(400).json({
            success: false,
            message: "Invalid variant id",
          });
        }
      }

      const bannerImage = await uploadCarImage(
        req.files.banner[0],
        "cars/banner"
      );

      const galleryImages = req.files.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadCarImage(img, "cars/gallery")
            )
          )
        : [];

      const car = await Car.create({
        ...req.body,
        brand,
        variant,
        bannerImage,
        galleryImages,
      });

      res.status(201).json({
        success: true,
        message: "Car added successfully",
        car,
      });
    } catch (err) {
      console.log("CAR ADD ERROR:", err); // ✅ DEBUG SAFE
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/* =====================================================
   GET ALL CARS (SMART FILTER)
===================================================== */
router.get("/", verifyTokenOptional, async (req, res) => {
  try {
    const {
      brand,
      variant,
      variantTitle,
      fuel,
      transmission,
      owner,
      board,
      district,
      city,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
    } = req.query;

    const query = {};

    if (brand && mongoose.Types.ObjectId.isValid(brand)) {
      query.brand = { $in: [brand] };
    }

    if (variant && mongoose.Types.ObjectId.isValid(variant)) {
      query.variant = { $in: [variant] };
    }

    if (fuel) query.fuel = fuel;
    if (transmission) query.transmission = transmission;
    if (owner) query.owner = owner;
    if (board) query.board = board;
    if (district) query.district = district;
    if (city) query.city = city;

    if (variantTitle) {
      const variantDoc = await Variant.findOne({
        title: { $regex: `^${variantTitle}$`, $options: "i" },
      }).select("_id");

      if (!variantDoc) {
        return res.json({
          success: true,
          count: 0,
          cars: [],
        });
      }

      query.variant = { $in: [variantDoc._id] };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (minYear || maxYear) {
      query.year = {};
      if (minYear) query.year.$gte = Number(minYear);
      if (maxYear) query.year.$lte = Number(maxYear);
    }

    const cars = await Car.find(query)
      .populate("brand", "name logoUrl")
      .populate("variant", "title imageUrl")
      .sort({ createdAt: -1 })
      .lean();

    const isAdminUser = req.user?.role === "admin";

    const finalCars = cars.map((car) => {
      if (
        isAdminUser &&
        typeof car.seller === "string" &&
        car.seller.includes(":")
      ) {
        try {
          car.seller = decryptSeller(car.seller);
        } catch (_) {}
      }
      return car;
    });

    res.json({
      success: true,
      count: finalCars.length,
      cars: finalCars,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cars",
    });
  }
});

/* =====================================================
   UPDATE CAR (ADMIN)
===================================================== */
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadCar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const car = await Car.findById(req.params.id);

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      const brand = parseArrayField(req.body.brand);
      const variant = parseArrayField(req.body.variant);

      if (brand.length) car.brand = brand;
      if (variant.length) car.variant = variant;

      if (req.files?.banner) {
        await deleteCarImage(car.bannerImage);
        car.bannerImage = await uploadCarImage(
          req.files.banner[0],
          "cars/banner"
        );
      }

      let existingGallery = [];

      if (req.body.existingGallery) {
        try {
          existingGallery = JSON.parse(req.body.existingGallery);
        } catch {
          existingGallery = [];
        }
      }

      for (const img of car.galleryImages) {
        if (!existingGallery.includes(img)) {
          await deleteCarImage(img);
        }
      }

      const newGallery = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadCarImage(img, "cars/gallery")
            )
          )
        : [];

      car.galleryImages = [...existingGallery, ...newGallery];

      const { banner, gallery, existingGallery: eg, ...safeBody } =
        req.body;

      Object.assign(car, safeBody);

      await car.save();

      res.json({
        success: true,
        message: "Car updated successfully",
        car,
      });
    } catch (err) {
      console.log("CAR UPDATE ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Car update failed",
      });
    }
  }
);

/* =====================================================
   DELETE CAR (ADMIN)
===================================================== */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    await deleteCarImage(car.bannerImage);

    for (const img of car.galleryImages) {
      await deleteCarImage(img);
    }

    await car.deleteOne();

    res.json({
      success: true,
      message: "Car deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});

export default router;
