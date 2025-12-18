import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import Car from "../models/car_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

/* -------------------------------------------------
   ✅ Cloudinary Storage Setup
---------------------------------------------------*/
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "rebuy_cars",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

/* =================================================
   ✅ FILTER CARS (FIXED & SAFE)
   GET /api/cars/filter
==================================================*/
router.get("/filter", async (req, res) => {
  try {
    const {
      brand,
      model,
      fuel,
      transmission,
      owner,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
    } = req.query;

    const query = {};

    // 🔹 BASIC FILTERS
    if (brand) query.brand = brand;
    if (model) query.model = { $regex: model, $options: "i" };
    if (fuel) query.fuel = fuel;
    if (transmission) query.transmission = transmission;
    if (owner) query.owner = owner;

    // 🔹 PRICE FILTER (0 SAFE)
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined) {
        query.price.$lte = Number(maxPrice);
      }
    }

    // 🔹 YEAR FILTER (STRING → NUMBER SAFE)
    if (minYear !== undefined || maxYear !== undefined) {
      query.$expr = {
        $and: [
          {
            $gte: [
              { $toInt: "$year" },
              Number(minYear ?? 0),
            ],
          },
          {
            $lte: [
              { $toInt: "$year" },
              Number(maxYear ?? new Date().getFullYear()),
            ],
          },
        ],
      };
    }

    const cars = await Car.find(query)
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cars.length,
      cars,
    });
  } catch (error) {
    console.error("❌ Filter Error:", error);
    res.status(500).json({
      success: false,
      message: "Error filtering cars",
    });
  }
});

/* =================================================
   ✅ ADD CAR (ADMIN)
   POST /api/cars/add
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
      const {
        brand,
        model,
        year,
        price,
        km,
        color,
        fuel,
        transmission,
        owner,
        board,
        description,
        insurance,
        status,
      } = req.body;

      if (!req.files?.banner) {
        return res.status(400).json({
          success: false,
          message: "Banner image is required",
        });
      }

      const bannerImage = req.files.banner[0].path;
      const galleryImages = req.files.gallery
        ? req.files.gallery.map((img) => img.path)
        : [];

      const car = new Car({
        brand,
        model,
        year,
        price,
        km,
        color,
        fuel,
        transmission,
        owner,
        board,
        description,
        insurance,
        status,
        bannerImage,
        galleryImages,
      });

      await car.save();

      res.status(201).json({
        success: true,
        message: "✅ Car added successfully",
        car,
      });
    } catch (error) {
      console.error("❌ Add Car Error:", error);
      res.status(500).json({
        success: false,
        message: "Error adding car",
      });
    }
  }
);

/* =================================================
   ✅ GET ALL CARS (PUBLIC)
   GET /api/cars
==================================================*/
router.get("/", async (req, res) => {
  try {
    const cars = await Car.find()
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cars.length,
      cars,
    });
  } catch (error) {
    console.error("❌ Fetch Cars Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cars",
    });
  }
});

/* =================================================
   ✅ GET SINGLE CAR BY ID
   GET /api/cars/:id
==================================================*/
router.get("/:id", async (req, res) => {
  try {
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

    res.status(200).json({
      success: true,
      car,
    });
  } catch (error) {
    console.error("❌ Single Car Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching car",
    });
  }
});

/* =================================================
   ✅ UPDATE CAR (ADMIN)
   PUT /api/cars/:id
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
      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      if (req.files?.banner) {
        const oldBanner = car.bannerImage.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`rebuy_cars/${oldBanner}`);
        car.bannerImage = req.files.banner[0].path;
      }

      if (req.files?.gallery) {
        for (const img of car.galleryImages) {
          const imgId = img.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`rebuy_cars/${imgId}`);
        }
        car.galleryImages = req.files.gallery.map((f) => f.path);
      }

      Object.assign(car, req.body);
      await car.save();

      res.status(200).json({
        success: true,
        message: "📝 Car updated successfully",
        car,
      });
    } catch (error) {
      console.error("❌ Update Car Error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating car",
      });
    }
  }
);

/* =================================================
   ✅ DELETE CAR (ADMIN)
   DELETE /api/cars/:id
==================================================*/
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    const bannerId = car.bannerImage.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(`rebuy_cars/${bannerId}`);

    for (const img of car.galleryImages) {
      const imgId = img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`rebuy_cars/${imgId}`);
    }

    await car.deleteOne();

    res.status(200).json({
      success: true,
      message: "🗑️ Car deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete Car Error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting car",
    });
  }
});

export default router;
