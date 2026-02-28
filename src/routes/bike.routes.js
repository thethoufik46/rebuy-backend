import express from "express";
import mongoose from "mongoose";
import Bike from "../models/bike_model.js";
import User from "../models/user_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { verifyTokenOptional } from "../middleware/verifyTokenOptional.js";
import uploadBike from "../middleware/uploadBike.js";

import {
  uploadBikeImage,
  deleteBikeImage,
} from "../utils/bikeUpload.js";

import { decryptSeller } from "../utils/sellerCrypto.js";

const router = express.Router();

/* =====================================================
   ✅ ADD BIKE (ADMIN)
===================================================== */
router.post(
  "/add",
  verifyToken,
  isAdmin,
  uploadBike.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const { brand, videoLink } = req.body;

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

      /* ========= Upload Banner ========= */
      const bannerImage = await uploadBikeImage(
        req.files.banner[0],
        "bikes/banner"
      );

      /* ========= Upload Gallery ========= */
      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadBikeImage(img, "bikes/gallery")
            )
          )
        : [];

      /* ========= Upload Audio ========= */
      let audioNote = null;
      if (req.files?.audio) {
        audioNote = await uploadBikeImage(
          req.files.audio[0],
          "bikes/audio"
        );
      }

      /* ========= Upload Videos ========= */
      const videos = req.files?.video
        ? await Promise.all(
            req.files.video.map((vid) =>
              uploadBikeImage(vid, "bikes/videos")
            )
          )
        : [];

      const bike = await Bike.create({
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
        message: "Bike added successfully",
        bike,
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
   ✅ GET ALL BIKES
===================================================== */
/* =====================================================
   ✅ GET ALL BIKES
===================================================== */
router.get("/", verifyTokenOptional, async (req, res) => {
  try {
    const isAdminUser = req.user?.role === "admin";
    const query = {};

    const {
      brand,
      owner,
      insurance,
      district,
      city,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
    } = req.query;

    /* ===============================
       🔎 FILTERS
    =============================== */

    if (brand) query.brand = brand;

    if (owner) {
      query.owner = {
        $in: owner.split(","),
      };
    }

    if (insurance) query.insurance = insurance;
    if (district) query.district = district;
    if (city) query.city = city;

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

    /* ===============================
       🚫 HIDE DRAFT FOR USERS
    =============================== */
    if (!isAdminUser) {
      query.status = { $nin: ["draft", "delete_requested"] };
    }

    /* ===============================
       📦 FETCH DATA
    =============================== */
    const bikes = await Bike.find(query)
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 })
      .lean();

    /* ===============================
       🔐 DECRYPT SELLER (ADMIN ONLY)
    =============================== */
    const finalBikes = bikes.map((bike) => {
      if (
        isAdminUser &&
        typeof bike.seller === "string" &&
        bike.seller.includes(":")
      ) {
        try {
          bike.seller = decryptSeller(bike.seller);
        } catch (_) {}
      }
      return bike;
    });

    /* ===============================
       📤 RESPONSE
    =============================== */
    res.json({
      success: true,
      count: finalBikes.length,
      bikes: finalBikes,
    });

  } catch (err) {
    console.error("GET BIKES ERROR:", err.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bikes",
    });
  }
});

/* =====================================================
   ✅ UPDATE BIKE (ADMIN)
===================================================== */
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadBike.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const bike = await Bike.findById(req.params.id);
      if (!bike)
        return res.status(404).json({
          success: false,
          message: "Bike not found",
        });

      /* ===== Banner Replace ===== */
      if (req.files?.banner?.length) {
        if (bike.bannerImage)
          await deleteBikeImage(bike.bannerImage);

        bike.bannerImage = await uploadBikeImage(
          req.files.banner[0],
          "bikes/banner"
        );
      }

      /* ===== Gallery Append ===== */
      if (req.files?.gallery?.length) {
        const newGallery = await Promise.all(
          req.files.gallery.map((img) =>
            uploadBikeImage(img, "bikes/gallery")
          )
        );

        bike.galleryImages = [
          ...(bike.galleryImages || []),
          ...newGallery,
        ];
      }

      /* ===== Audio Replace ===== */
      if (req.files?.audio?.length) {
        if (bike.audioNote)
          await deleteBikeImage(bike.audioNote);

        bike.audioNote = await uploadBikeImage(
          req.files.audio[0],
          "bikes/audio"
        );
      }

      /* ===== Videos Append ===== */
      if (req.files?.video?.length) {
        const newVideos = await Promise.all(
          req.files.video.map((vid) =>
            uploadBikeImage(vid, "bikes/videos")
          )
        );

        bike.videos = [
          ...(bike.videos || []),
          ...newVideos,
        ];
      }

      if (req.body.videoLink !== undefined) {
        bike.videoLink = req.body.videoLink || null;
      }

      const allowedFields = [
        "brand",
        "model",
        "year",
        "price",
        "km",
        "owner",
        "insurance",
        "status",
        "sellerinfo",
        "district",
        "city",
        "description",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          bike[field] = req.body[field];
        }
      });

      await bike.save();

      res.json({
        success: true,
        message: "Bike updated successfully",
        bike,
      });
    } catch {
      res.status(500).json({
        success: false,
        message: "Bike update failed",
      });
    }
  }
);



/* =====================================================
   ✅ DELETE BIKE (ADMIN)
===================================================== */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike)
      return res.status(404).json({
        success: false,
        message: "Bike not found",
      });

    if (bike.bannerImage)
      await deleteBikeImage(bike.bannerImage);

    for (const img of bike.galleryImages || [])
      await deleteBikeImage(img);

    if (bike.audioNote)
      await deleteBikeImage(bike.audioNote);

    for (const vid of bike.videos || [])
      await deleteBikeImage(vid);

    await bike.deleteOne();

    res.json({
      success: true,
      message: "Bike deleted successfully",
    });

  } catch (err) {
    console.error("DELETE BIKE ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});


/* =====================================================
   ✅ USER ADD BIKE (DRAFT FLOW)
===================================================== */
router.post(
  "/user-add",
  verifyToken,
  uploadBike.fields([
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 3 },
  ]),
  async (req, res) => {
    try {
      const { brand, videoLink } = req.body;

      if (!mongoose.Types.ObjectId.isValid(brand)) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand id",
        });
      }

      const user = await User.findById(req.user.id);
      if (!user)
        return res.status(404).json({
          success: false,
          message: "User not found",
        });

      /* Upload Gallery */
      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadBikeImage(img, "bikes/gallery")
            )
          )
        : [];

      /* Upload Audio */
      let audioNote = null;
      if (req.files?.audio) {
        audioNote = await uploadBikeImage(
          req.files.audio[0],
          "bikes/audio"
        );
      }

      /* Upload Videos */
      const videos = req.files?.video
        ? await Promise.all(
            req.files.video.map((vid) =>
              uploadBikeImage(vid, "bikes/videos")
            )
          )
        : [];

      const bike = await Bike.create({
        ...req.body,
        bannerImage: null,
        galleryImages,
        audioNote,
        videos,
        videoLink: videoLink || null,
        seller: String(user.phone),
        sellerUser: user._id,
        createdBy: user._id,
        status: "draft",
        price: null,
      });

      res.status(201).json({
        success: true,
        message: "Bike submitted for admin approval",
        bike,
      });

    } catch (err) {
      console.error("USER ADD BIKE ERROR:", err.message);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);


/* =====================================================
   ✅ GET MY BIKES (USER LISTINGS)
===================================================== */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const bikes = await Bike.find({ createdBy: userId })
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 })
      .lean();

    const safeBikes = bikes.map((bike) => {
      if (
        typeof bike.seller === "string" &&
        bike.seller.includes(":")
      ) {
        bike.seller = "**********";
      }
      return bike;
    });

    res.json({
      success: true,
      count: safeBikes.length,
      bikes: safeBikes,
    });

  } catch (err) {
    console.error("GET MY BIKES ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user bikes",
    });
  }
});


/* =====================================================
   ✅ USER REQUEST DELETE (BIKE)
===================================================== */
router.put("/:id/request-delete", verifyToken, async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);

    if (!bike) {
      return res.status(404).json({
        success: false,
        message: "Bike not found",
      });
    }

    if (bike.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    bike.status = "delete_requested";
    await bike.save();

    res.json({
      success: true,
      message: "Delete request sent",
    });

  } catch (err) {
    console.error("REQUEST DELETE ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to request delete",
    });
  }
});

export default router;




