import express from "express";
import mongoose from "mongoose";
import Car from "../models/car_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import uploadCar from "../middleware/uploadCar.js";
import {
  uploadCarImage,
  deleteCarImage,
} from "../utils/carUpload.js";

const router = express.Router();

/* ======================
   ADD CAR
====================== */
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
      if (!req.files?.banner) {
        return res.status(400).json({
          success: false,
          message: "Banner image required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(req.body.brand)) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand id",
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
        message: "✅ Car added successfully",
        car,
      });
    } catch (err) {
      console.error("ADD CAR ERROR:", err);

      return res.status(500).json({
        success: false,
        message: err.message || "Car upload failed",
      });
    }
  }
);



/* ======================
   GET ALL CARS
====================== */
router.get("/", async (req, res) => {
  try {
    const cars = await Car.find()
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: cars.length,
      cars,
    });
  } catch (err) {
    console.error("GET CARS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cars",
    });
  }
});

/* ======================
   UPDATE CAR
====================== */
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
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid car id" });
      }

      const car = await Car.findById(req.params.id);
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }

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

      return res.json({ success: true, car });
    } catch (err) {
      console.error("UPDATE CAR ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Update failed",
      });
    }
  }
);

/* ======================
   DELETE CAR
====================== */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid car id" });
    }

    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    await deleteCarImage(car.bannerImage);

    for (const img of car.galleryImages) {
      await deleteCarImage(img);
    }

    await car.deleteOne();

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE CAR ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});

export default router;
