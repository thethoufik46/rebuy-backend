import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import Bike from "../models/bike_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

/* -------------------------------------------------
   ✅ Cloudinary Storage Setup
---------------------------------------------------*/
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "rebuy_bikes",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage });

/* =================================================
   ✅ FILTER BIKES
   GET /api/bikes/filter
==================================================*/
router.get("/filter", async (req, res) => {
  try {
    const {
      brand,
      model,
      owner,
      sellerinfo,
      location,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
      status,
    } = req.query;

    const query = {};

    if (brand) query.brand = brand;
    if (model) query.model = { $regex: model, $options: "i" };
    if (owner) query.owner = owner;
    if (status) query.status = status;
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

    const bikes = await Bike.find(query)
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bikes.length,
      bikes,
    });
  } catch (error) {
    console.error("❌ Filter Bike Error:", error);
    res.status(500).json({
      success: false,
      message: "Error filtering bikes",
    });
  }
});

/* =================================================
   ✅ ADD BIKE (ADMIN)
   POST /api/bikes/add
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
        owner,
        status,
        seller,
        location,
        sellerinfo,
        description,
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

      const bike = new Bike({
        brand,
        model,
        year,
        price,
        km,
        owner,
        status,
        seller,
        location,
        sellerinfo,
        description,
        bannerImage,
        galleryImages,
      });

      await bike.save();

      res.status(201).json({
        success: true,
        message: "✅ Bike added successfully",
        bike,
      });
    } catch (error) {
      console.error("❌ Add Bike Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error adding bike",
      });
    }
  }
);

/* =================================================
   ✅ GET ALL BIKES
==================================================*/
router.get("/", async (req, res) => {
  try {
    const bikes = await Bike.find()
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bikes.length,
      bikes,
    });
  } catch (error) {
    console.error("❌ Fetch Bikes Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bikes",
    });
  }
});

/* =================================================
   ✅ GET SINGLE BIKE
==================================================*/
router.get("/:id", async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id).populate(
      "brand",
      "name logoUrl"
    );

    if (!bike) {
      return res.status(404).json({
        success: false,
        message: "Bike not found",
      });
    }

    res.status(200).json({
      success: true,
      bike,
    });
  } catch (error) {
    console.error("❌ Single Bike Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bike",
    });
  }
});

/* =================================================
   ✅ UPDATE BIKE (ADMIN)
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
      const bike = await Bike.findById(req.params.id);
      if (!bike) {
        return res.status(404).json({
          success: false,
          message: "Bike not found",
        });
      }

      if (req.files?.banner) {
        const oldBanner = bike.bannerImage.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`rebuy_bikes/${oldBanner}`);
        bike.bannerImage = req.files.banner[0].path;
      }

      if (req.files?.gallery) {
        for (const img of bike.galleryImages) {
          const imgId = img.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`rebuy_bikes/${imgId}`);
        }
        bike.galleryImages = req.files.gallery.map((f) => f.path);
      }

      Object.assign(bike, req.body);
      await bike.save();

      res.status(200).json({
        success: true,
        message: "📝 Bike updated successfully",
        bike,
      });
    } catch (error) {
      console.error("❌ Update Bike Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error updating bike",
      });
    }
  }
);

/* =================================================
   ✅ DELETE BIKE
==================================================*/
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike) {
      return res.status(404).json({
        success: false,
        message: "Bike not found",
      });
    }

    const bannerId = bike.bannerImage.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(`rebuy_bikes/${bannerId}`);

    for (const img of bike.galleryImages) {
      const imgId = img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`rebuy_bikes/${imgId}`);
    }

    await bike.deleteOne();

    res.status(200).json({
      success: true,
      message: "🗑️ Bike deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete Bike Error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting bike",
    });
  }
});

export default router;
