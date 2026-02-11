import express from "express";
import mongoose from "mongoose";
import Car from "../models/car_model.js";
import Variant from "../models/car_variant_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { verifyTokenOptional } from "../middleware/verifyTokenOptional.js";
import uploadCar from "../middleware/uploadCar.js";
import { uploadCarImage, deleteCarImage } from "../utils/carUpload.js";
import { decryptSeller } from "../utils/sellerCrypto.js";

const router = express.Router();

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

      if (variant && !mongoose.Types.ObjectId.isValid(variant)) {
        return res.status(400).json({
          success: false,
          message: "Invalid variant id",
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
   GET ALL CARS (SMART FILTER ENGINE)
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

    if (brand) query.brand = brand;
    if (fuel) query.fuel = fuel;
    if (transmission) query.transmission = transmission;
    if (owner) query.owner = owner;
    if (board) query.board = board;
    if (district) query.district = district;
    if (city) query.city = city;

    /* ✅ Variant by ObjectId */
    if (variant && mongoose.Types.ObjectId.isValid(variant)) {
      query.variant = variant;
    }

    /* ✅ Variant by Title (VERY IMPORTANT) */
    if (variantTitle) {
      const variantDoc = await Variant.findOne({
        title: { $regex: `^${variantTitle}$`, $options: "i" },
      }).select("_id");

      if (!variantDoc) {
        return res.status(200).json({
          success: true,
          count: 0,
          cars: [],
        });
      }

      query.variant = variantDoc._id;
    }

    /* ✅ Price Filter */
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    /* ✅ Year Filter */
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
      let seller = car.seller;

      if (
        isAdminUser &&
        typeof seller === "string" &&
        seller.includes(":")
      ) {
        try {
          seller = decryptSeller(seller);
        } catch (_) {}
      }

      return { ...car, seller };
    });

    return res.status(200).json({
      success: true,
      count: finalCars.length,
      cars: finalCars,
    });
  } catch (err) {
    console.error("GET /cars error:", err);

    return res.status(500).json({
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

      /* ✅ Banner Replace */
      if (req.files?.banner) {
        await deleteCarImage(car.bannerImage);

        car.bannerImage = await uploadCarImage(
          req.files.banner[0],
          "cars/banner"
        );
      }

      /* ✅ Gallery Handling */
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

      let newGallery = [];

      if (req.files?.gallery) {
        newGallery = await Promise.all(
          req.files.gallery.map((img) =>
            uploadCarImage(img, "cars/gallery")
          )
        );
      }

      car.galleryImages = [...existingGallery, ...newGallery];

      const { existingGallery: eg, banner, gallery, ...safeBody } = req.body;

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
