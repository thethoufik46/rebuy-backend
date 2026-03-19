import express from "express";
import mongoose from "mongoose";
import Car from "../models/car_model.js";
import User from "../models/user_model.js";
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
    { name: "video", maxCount: 5 }, // ✅ NEW
  ]),
  async (req, res) => {
    try {
      const { brand, variant, videoLink } = req.body;

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

      /* Upload Banner */
      const bannerImage = await uploadCarImage(
        req.files.banner[0],
        "cars/banner"
      );

      /* Upload Gallery */
      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadCarImage(img, "cars/gallery")
            )
          )
        : [];

      /* Upload Audio */
      let audioNote = null;
      if (req.files?.audio) {
        audioNote = await uploadCarImage(
          req.files.audio[0],
          "cars/audio"
        );
      }

      /* Upload Videos */
      const videos = req.files?.video
        ? await Promise.all(
            req.files.video.map((vid) =>
              uploadCarImage(vid, "cars/videos")
            )
          )
        : [];

      const car = await Car.create({
        ...req.body,
        bannerImage,
        galleryImages,
        audioNote,
        videos,
        videoLink: videoLink || null,
        createdBy: req.user.id,
        status: "available",
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
   ✅ GET ALL CARS (WITH DISTRICT FILTER)
===================================================== */
router.get("/", verifyTokenOptional, async (req, res) => {
  try {
    const isAdminUser = req.user?.role === "admin";
    const query = {};

    const {
      brand,
      variant,
      fuel,
      transmission,
      owner,
      board,
      district,       // ✅ NEW DISTRICT FILTER
      minPrice,
      maxPrice,
      minYear,
      maxYear,
    } = req.query;

    if (brand) query.brand = brand;
    if (variant) query.variant = variant;

    // ✅ Add district filter if provided
    if (district) query.district = district;

    if (fuel) {
      query.fuel = { $in: fuel.split(",").map(f => f.toLowerCase()) };
    }

    if (owner) {
      query.owner = { $in: owner.split(",").map(Number) };
    }

    if (transmission) query.transmission = transmission;
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

    if (!isAdminUser) {
      query.status = { $nin: ["draft", "delete_requested"] };
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
   ✅ UPDATE CAR (ADMIN - FINAL SAFE VERSION)
===================================================== */

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadCar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 5 },
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

      /* =====================================================
         ✅ BANNER UPDATE (REPLACE SAFE)
      ===================================================== */
      if (req.files?.banner?.length) {
        if (car.bannerImage) {
          await deleteCarImage(car.bannerImage);
        }

        car.bannerImage = await uploadCarImage(
          req.files.banner[0],
          "cars/banner"
        );
      }

      /* =====================================================
         ✅ GALLERY UPDATE (SAFE DELETE + APPEND)
      ===================================================== */

      if (req.body.existingGallery !== undefined) {
        let existingGallery;

        try {
          existingGallery = Array.isArray(req.body.existingGallery)
            ? req.body.existingGallery
            : JSON.parse(req.body.existingGallery);
        } catch (err) {
          // 🔥 If parsing fails, DO NOT DELETE anything
          existingGallery = car.galleryImages || [];
        }

        if (Array.isArray(existingGallery)) {
          // Delete only removed images
          const imagesToDelete = (car.galleryImages || []).filter(
            (img) => !existingGallery.includes(img)
          );

          for (const img of imagesToDelete) {
            await deleteCarImage(img);
          }

          car.galleryImages = existingGallery;
        }
      }

      // Append new gallery images
      if (req.files?.gallery?.length) {
        const newGallery = await Promise.all(
          req.files.gallery.map((img) =>
            uploadCarImage(img, "cars/gallery")
          )
        );

        car.galleryImages = [
          ...(car.galleryImages || []),
          ...newGallery,
        ];
      }

      /* =====================================================
         ✅ AUDIO UPDATE (REPLACE SAFE)
      ===================================================== */
      if (req.files?.audio?.length) {
        if (car.audioNote) {
          await deleteCarImage(car.audioNote);
        }

        car.audioNote = await uploadCarImage(
          req.files.audio[0],
          "cars/audio"
        );
      }

      /* =====================================================
         ✅ VIDEO UPDATE (SAFE DELETE + APPEND)
      ===================================================== */

      if (req.body.existingVideos !== undefined) {
        let existingVideos;

        try {
          existingVideos = Array.isArray(req.body.existingVideos)
            ? req.body.existingVideos
            : JSON.parse(req.body.existingVideos);
        } catch (err) {
          existingVideos = car.videos || [];
        }

        if (Array.isArray(existingVideos)) {
          const videosToDelete = (car.videos || []).filter(
            (vid) => !existingVideos.includes(vid)
          );

          for (const vid of videosToDelete) {
            await deleteCarImage(vid);
          }

          car.videos = existingVideos;
        }
      }

      // Append new videos
      if (req.files?.video?.length) {
        const newVideos = await Promise.all(
          req.files.video.map((vid) =>
            uploadCarImage(vid, "cars/videos")
          )
        );

        car.videos = [
          ...(car.videos || []),
          ...newVideos,
        ];
      }

      /* =====================================================
         ✅ VIDEO LINK UPDATE
      ===================================================== */
      if (req.body.videoLink !== undefined) {
        car.videoLink = req.body.videoLink || null;
      }

      /* =====================================================
         ✅ SAFE FIELD UPDATE
      ===================================================== */
      const allowedFields = [
        "brand",
        "variant",
        "model",
        "year",
        "price",
        "km",
        "color",
        "fuel",
        "transmission",
        "owner",
        "board",
        "insurance",
        "status",
        "sellerinfo",
        "district",
        "city",
        "description",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          car[field] = req.body[field];
        }
      });

      await car.save();

      res.json({
        success: true,
        message: "Car updated successfully",
        car,
      });

    } catch (err) {
      console.log("UPDATE ERROR:", err);
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

    /* =====================================================
       ✅ DELETE BANNER
    ===================================================== */
    if (car.bannerImage) {
      await deleteCarImage(car.bannerImage);
    }

    /* =====================================================
       ✅ DELETE GALLERY IMAGES
    ===================================================== */
    if (car.galleryImages && car.galleryImages.length > 0) {
      for (const img of car.galleryImages) {
        await deleteCarImage(img);
      }
    }

    /* =====================================================
       ✅ DELETE AUDIO
    ===================================================== */
    if (car.audioNote) {
      await deleteCarImage(car.audioNote);
    }

    /* =====================================================
       ✅ DELETE UPLOADED VIDEOS
    ===================================================== */
    if (car.videos && car.videos.length > 0) {
      for (const vid of car.videos) {
        await deleteCarImage(vid);
      }
    }

    /* =====================================================
       ✅ DELETE DOCUMENT
    ===================================================== */
    await car.deleteOne();

    res.json({
      success: true,
      message: "Car deleted successfully",
    });

  } catch (err) {
    console.log("DELETE ERROR:", err);

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
    { name: "video", maxCount: 3 }, // ✅ NEW
  ]),
  async (req, res) => {
    try {
      const { brand, variant, videoLink } = req.body;

      /* ==============================
         ✅ BRAND VALIDATION
      ============================== */
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

      /* ==============================
         ✅ FIND USER
      ============================== */
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      /* ==============================
         ✅ UPLOAD GALLERY
      ============================== */
      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadCarImage(img, "cars/gallery")
            )
          )
        : [];

      /* ==============================
         ✅ UPLOAD AUDIO
      ============================== */
      let audioNote = null;

      if (req.files?.audio) {
        audioNote = await uploadCarImage(
          req.files.audio[0],
          "cars/audio"
        );
      }

      /* ==============================
         ✅ UPLOAD VIDEOS
      ============================== */
      const videos = req.files?.video
        ? await Promise.all(
            req.files.video.map((vid) =>
              uploadCarImage(vid, "cars/videos")
            )
          )
        : [];

      /* ==============================
         ✅ CREATE CAR
      ============================== */
      const car = await Car.create({
        ...req.body,

        bannerImage: null,
        galleryImages,
        audioNote,
        videos,
        videoLink: videoLink || null,

        seller: String(user.phone), // 🔥 Always string
        sellerUser: user._id,
        createdBy: user._id,

        status: "draft",
        price: null,
      });

      res.status(201).json({
        success: true,
        message: "Car submitted for admin approval",
        car,
      });

    } catch (err) {
      console.log("USER ADD ERROR:", err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/* =====================================================
   ✅ GET MY CARS (USER LISTINGS 🔥)
===================================================== */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const cars = await Car.find({ createdBy: userId })
      .populate("brand", "name logoUrl")
      .populate("variant", "title imageUrl")
      .sort({ createdAt: -1 })
      .lean();

    /* ==============================
       ✅ MASK SELLER FOR USER VIEW
    ============================== */
    const safeCars = cars.map((car) => {
      if (
        typeof car.seller === "string" &&
        car.seller.includes(":")
      ) {
        car.seller = "**********";
      }
      return car;
    });

    res.json({
      success: true,
      count: safeCars.length,
      cars: safeCars,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user cars",
    });
  }
});

/* =====================================================
   ✅ USER REQUEST DELETE
===================================================== */
router.put("/:id/request-delete", verifyToken, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    /* ==============================
       ✅ ONLY OWNER CAN REQUEST
    ============================== */
    if (car.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    car.status = "delete_requested";
    await car.save();

    res.json({
      success: true,
      message: "Delete request sent",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to request delete",
    });
  }
});

export default router;




