import express from "express";
import Car from "../models/car_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

import upload from "../middleware/upload.js";
import {
  uploadCarImage,
  deleteCarImage,
} from "../utils/carUpload.js";

const router = express.Router();

/* =================================================
   ✅ FILTER CARS
==================================================*/
router.get("/filter", async (req, res) => {
  try {
    const {
      brand,
      model,
      fuel,
      transmission,
      owner,
      board,
      sellerinfo,
      location,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
    } = req.query;

    const query = {};

    if (brand) query.brand = brand;
    if (model) query.model = { $regex: model, $options: "i" };
    if (fuel) query.fuel = fuel;
    if (transmission) query.transmission = transmission;
    if (owner) query.owner = owner;
    if (board) query.board = board;
    if (sellerinfo) query.sellerinfo = sellerinfo;
    if (location) query.location = { $regex: location, $options: "i" };

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
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: cars.length,
      cars,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Filter failed",
    });
  }
});

/* =================================================
   ✅ ADD CAR (ADMIN)
==================================================*/
router.post(
  "/add",
  verifyToken,
  isAdmin,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      if (!req.files?.banner) {
        return res.status(400).json({
          success: false,
          message: "Banner image required",
        });
      }

      // upload banner
      const bannerKey = await uploadCarImage(
        req.files.banner[0],
        "cars/banner"
      );

      // upload gallery
      const galleryKeys = req.files.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadCarImage(img, "cars/gallery")
            )
          )
        : [];

      const car = await Car.create({
        ...req.body,
        bannerImage: bannerKey,
        galleryImages: galleryKeys,
      });

      res.status(201).json({
        success: true,
        message: "✅ Car added successfully",
        car,
      });
    } catch (err) {
      console.error("CAR ADD ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Car upload failed",
      });
    }
  }
);

/* =================================================
   ✅ GET ALL CARS
==================================================*/
router.get("/", async (req, res) => {
  const cars = await Car.find()
    .populate("brand", "name logoUrl")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: cars.length,
    cars,
  });
});

/* =================================================
   ✅ GET SINGLE CAR
==================================================*/
router.get("/:id", async (req, res) => {
  const car = await Car.findById(req.params.id).populate(
    "brand",
    "name logoUrl"
  );

  if (!car) {
    return res.status(404).json({
      success: false,
      message: "Car not found",
    });
  }

  res.json({
    success: true,
    car,
  });
});

/* =================================================
   ✅ UPDATE CAR
==================================================*/
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const car = await Car.findById(req.params.id);
      if (!car)
        return res.status(404).json({ message: "Car not found" });

      if (req.files?.banner) {
        await deleteCarImage(car.bannerImage);
        car.bannerImage = await uploadCarImage(
          req.files.banner[0],
          "cars/banner"
        );
      }

      if (req.files?.gallery) {
        for (const img of car.galleryImages) {
          await deleteCarImage(img);
        }

        car.galleryImages = await Promise.all(
          req.files.gallery.map((img) =>
            uploadCarImage(img, "cars/gallery")
          )
        );
      }

      Object.assign(car, req.body);
      await car.save();

      res.json({
        success: true,
        message: "✅ Car updated successfully",
        car,
      });
    } catch (err) {
      res.status(500).json({
        message: "Update failed",
      });
    }
  }
);

/* =================================================
   ✅ DELETE CAR
==================================================*/
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car)
      return res.status(404).json({ message: "Car not found" });

    await deleteCarImage(car.bannerImage);

    for (const img of car.galleryImages) {
      await deleteCarImage(img);
    }

    await car.deleteOne();

    res.json({
      success: true,
      message: "🗑️ Car deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Delete failed",
    });
  }
});

export default router;
