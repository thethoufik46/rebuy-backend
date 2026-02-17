import express from "express";
import mongoose from "mongoose";
import Car from "../models/car_model.js";
import User from "../models/user_model.js"; // ✅ IMPORTANT
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
   ✅ ADD CAR (ADMIN)
===================================================== */
router.post(
  "/add",
  verifyToken,
  isAdmin,
  uploadCar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
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

      /* ✅ Upload Images */
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

      let audioNote = null;

      if (req.files?.audio) {
        audioNote = await uploadCarImage(
          req.files.audio[0],
          "cars/audio"
        );
      }

      /* ✅ CREATE CAR (CRITICAL FIX 🔥) */
      const car = await Car.create({
        ...req.body,

        bannerImage,
        galleryImages,
        audioNote,

        createdBy: req.user.id, // ✅🔥 OWNER FIX
        status: "available",     // ✅ Admin listings live
      });

      res.status(201).json({
        success: true,
        message: "Car added successfully",
        car,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/* =====================================================
   ✅ GET ALL CARS
===================================================== */
router.get("/", verifyTokenOptional, async (req, res) => {
  try {
    const query = { ...req.query };
    const isAdminUser = req.user?.role === "admin";

    /* ✅ Hide Draft for Public Users */
    if (!isAdminUser) {
      query.status = { $ne: "draft" };
    }

    const cars = await Car.find(query)
      .populate("brand", "name logoUrl")
      .populate("variant", "title imageUrl")
      .sort({ createdAt: -1 })
      .lean();

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
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cars",
    });
  }
});

/* =====================================================
   ✅ UPDATE CAR (ADMIN)
===================================================== */
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadCar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
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

      /* ✅ Banner */
      if (req.files?.banner) {
        if (car.bannerImage) {
          await deleteCarImage(car.bannerImage);
        }

        car.bannerImage = await uploadCarImage(
          req.files.banner[0],
          "cars/banner"
        );
      }

      /* ✅ Gallery */
      let newGallery = [];

      if (req.files?.gallery) {
        newGallery = await Promise.all(
          req.files.gallery.map((img) =>
            uploadCarImage(img, "cars/gallery")
          )
        );
      }

      car.galleryImages = [...car.galleryImages, ...newGallery];

      /* ✅ Audio */
      if (req.files?.audio) {
        if (car.audioNote) {
          await deleteCarImage(car.audioNote);
        }

        car.audioNote = await uploadCarImage(
          req.files.audio[0],
          "cars/audio"
        );
      }

      Object.assign(car, req.body);

      await car.save();

      res.json({
        success: true,
        message: "Car updated successfully",
        car,
      });
    } catch {
      res.status(500).json({
        success: false,
        message: "Car update failed",
      });
    }
  }
);

/* =====================================================
   ✅ DELETE CAR (ADMIN)
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

    if (car.bannerImage) {
      await deleteCarImage(car.bannerImage);
    }

    for (const img of car.galleryImages) {
      await deleteCarImage(img);
    }

    if (car.audioNote) {
      await deleteCarImage(car.audioNote);
    }

    await car.deleteOne();

    res.json({
      success: true,
      message: "Car deleted successfully",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});

/* =====================================================
   ✅ USER ADD CAR (DRAFT FLOW 🔥)
===================================================== */
router.post(
  "/user-add",
  verifyToken,
  uploadCar.fields([
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { brand, variant } = req.body;

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

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadCarImage(img, "cars/gallery")
            )
          )
        : [];

      let audioNote = null;

      if (req.files?.audio) {
        audioNote = await uploadCarImage(
          req.files.audio[0],
          "cars/audio"
        );
      }

      /* ✅ CREATE USER LISTING 🔥🔥🔥 */
      const car = await Car.create({
        ...req.body,

        bannerImage: null,
        galleryImages,
        audioNote,

        seller: user.phone,    // ✅ AUTO PHONE
        sellerUser: user._id,  // ✅ LINKED USER
        createdBy: user._id,   // ✅ OWNER

        status: "draft",
        price: null,
      });

      res.status(201).json({
        success: true,
        message: "Car submitted for admin approval",
        car,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/* =====================================================
   ✅ GET MY CARS
===================================================== */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const cars = await Car.find({ createdBy: req.user.id })
      .populate("brand", "name logoUrl")
      .populate("variant", "title imageUrl")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: cars.length,
      cars,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user cars",
    });
  }
});

export default router;
