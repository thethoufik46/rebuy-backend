// ======================= car.routes.js =======================
// 📁 src/routes/car.routes.js
// ✅ FINAL FULL CAR ROUTES – ADD / VIEW / UPDATE / DELETE
// 🔹 Brand → Variant supported
// 🔹 Seller encryption/decryption fixed
// 🔹 Banner + Gallery upload
// 🔹 Admin protected

import express from "express";
import mongoose from "mongoose";
import Car from "../models/car_model.js";
import Variant from "../models/car_variant_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import uploadCar from "../middleware/uploadCar.js";
import {
  uploadCarImage,
  deleteCarImage,
} from "../utils/carUpload.js";
import { decryptSeller } from "../utils/sellerCrypto.js";

const router = express.Router();

/* =====================================================
   ADD CAR
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
      const { brand, variant } = req.body;

      if (!req.files?.banner) {
        return res.status(400).json({
          success: false,
          message: "Banner image required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(brand)) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand id",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(variant)) {
        return res.status(400).json({
          success: false,
          message: "Invalid variant id",
        });
      }

      // ✅ ENSURE VARIANT BELONGS TO BRAND
      const variantDoc = await Variant.findById(variant);
      if (!variantDoc || String(variantDoc.brand) !== brand) {
        return res.status(400).json({
          success: false,
          message: "Variant does not belong to selected brand",
        });
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
        bannerImage,
        galleryImages,
      });

      return res.status(201).json({
        success: true,
        message: "Car added successfully",
        car,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/* =====================================================
   GET ALL CARS (FILTER + POPULATE + DECRYPT)
===================================================== */
router.get("/", async (req, res) => {
  try {
    const {
      brand,
      variant,
      fuel,
      transmission,
      owner,
      board,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
    } = req.query;

    const query = {};

    if (brand) query.brand = brand;
    if (variant) query.variant = variant;
    if (fuel) query.fuel = fuel;
    if (transmission) query.transmission = transmission;
    if (owner) query.owner = owner;
    if (board) query.board = board;

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
      .populate("variant", "title imageUrl variantName")
      .sort({ createdAt: -1 })
      .lean(); // 🔥 REQUIRED FOR MUTATION

    // ✅ DECRYPT SELLER NAME
    const formattedCars = cars.map((car) => ({
      ...car,
      seller: decryptSeller(car.seller),
    }));

    return res.status(200).json({
      success: true,
      count: formattedCars.length,
      cars: formattedCars,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cars",
    });
  }
});

/* =====================================================
   UPDATE CAR
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

      /* ---------- BANNER ---------- */
      if (req.files?.banner) {
        await deleteCarImage(car.bannerImage);
        car.bannerImage = await uploadCarImage(
          req.files.banner[0],
          "cars/banner"
        );
      }

      /* ---------- EXISTING GALLERY ---------- */
      let existingGallery = [];

      if (req.body.existingGallery) {
        existingGallery = Array.isArray(req.body.existingGallery)
          ? req.body.existingGallery
          : JSON.parse(req.body.existingGallery);
      }

      for (const img of car.galleryImages) {
        if (!existingGallery.includes(img)) {
          await deleteCarImage(img);
        }
      }

      /* ---------- NEW GALLERY ---------- */
      let newGallery = [];

      if (req.files?.gallery) {
        newGallery = await Promise.all(
          req.files.gallery.map((img) =>
            uploadCarImage(img, "cars/gallery")
          )
        );
      }

      car.galleryImages = [...existingGallery, ...newGallery];

      /* ---------- SAFE UPDATE ---------- */
      const {
        existingGallery: eg,
        banner,
        gallery,
        ...safeBody
      } = req.body;

      Object.assign(car, safeBody);

      await car.save();

      return res.status(200).json({
        success: true,
        message: "Car updated successfully",
        car,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Car update failed",
      });
    }
  }
);

/* =====================================================
   DELETE CAR
===================================================== */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid car id",
      });
    }

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

    return res.status(200).json({
      success: true,
      message: "Car deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});

export default router;
