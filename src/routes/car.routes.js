// src/routes/car.routes.js
import express from "express";
import Car from "../models/car_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import uploadCar from "../middleware/uploadCar.js";
import {
  uploadCarImage,
  deleteCarImage,
} from "../utils/carUpload.js";

const router = express.Router();

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

      res.status(201).json({ success: true, car });
    } catch (err) {
      console.error("ADD CAR ERROR:", err);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);


router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadCar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    const car = await Car.findById(req.params.id);

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

    res.json({ success: true, car });
  }
);

router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  const car = await Car.findById(req.params.id);

  await deleteCarImage(car.bannerImage);

  for (const img of car.galleryImages) {
    await deleteCarImage(img);
  }

  await car.deleteOne();

  res.json({ success: true });
});

export default router;
