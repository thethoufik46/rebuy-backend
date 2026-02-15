// ======================= src/routes/bike.routes.js =======================
// ✅ FINAL (SELLER DECRYPT LIKE CAR ROUTE)

import express from "express";
import mongoose from "mongoose";
import Bike from "../models/bike_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { verifyTokenOptional } from "../middleware/verifyTokenOptional.js";
import uploadBike from "../middleware/uploadBike.js";
import {
  uploadBikeImage,
  deleteBikeImage,
} from "../utils/bikeUpload.js";
import { decryptSeller } from "../utils/sellerCrypto.js";

const router = express.Router();

/* ======================
   ADD BIKE (ADMIN)
====================== */
router.post(
  "/add",
  verifyToken,
  isAdmin,
  uploadBike.fields([
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

      const bannerImage = await uploadBikeImage(
        req.files.banner[0],
        "bikes/banner"
      );

      const galleryImages = req.files.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadBikeImage(img, "bikes/gallery")
            )
          )
        : [];

      const bike = await Bike.create({
        ...req.body,
        bannerImage,
        galleryImages,
      });

      res.status(201).json({
        success: true,
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

/* ======================
   GET ALL BIKES (FILTER + SELLER DECRYPT)
====================== */
router.get("/", verifyTokenOptional, async (req, res) => {
  try {
    const {
      brand,
      owner,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
      status,
      district,
      city,
    } = req.query;

    const query = {};

    if (brand) query.brand = brand;
    if (owner) query.owner = owner;
    if (status) query.status = status;
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

    const bikes = await Bike.find(query)
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 })
      .lean();

    const isAdminUser = req.user?.role === "admin";

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

    res.json({
      success: true,
      count: finalBikes.length,
      bikes: finalBikes,
    });
  } catch (err) {
    console.error("BIKE FILTER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bikes",
    });
  }
});

/* ======================
   UPDATE BIKE (ADMIN)
====================== */
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadBike.fields([
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
        await deleteBikeImage(bike.bannerImage);

        bike.bannerImage = await uploadBikeImage(
          req.files.banner[0],
          "bikes/banner"
        );
      }

      let existingGallery = [];

      if (req.body.existingGallery) {
        existingGallery = Array.isArray(req.body.existingGallery)
          ? req.body.existingGallery
          : JSON.parse(req.body.existingGallery);
      }

      for (const img of bike.galleryImages) {
        if (!existingGallery.includes(img)) {
          await deleteBikeImage(img);
        }
      }

      let newGallery = [];

      if (req.files?.gallery) {
        newGallery = await Promise.all(
          req.files.gallery.map((img) =>
            uploadBikeImage(img, "bikes/gallery")
          )
        );
      }

      bike.galleryImages = [...existingGallery, ...newGallery];

      const {
        existingGallery: eg,
        banner,
        gallery,
        ...safeBody
      } = req.body;

      Object.assign(bike, safeBody);

      await bike.save();

      res.json({
        success: true,
        bike,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Bike update failed",
      });
    }
  }
);

/* ======================
   DELETE BIKE (ADMIN)
====================== */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);

    if (!bike) {
      return res.status(404).json({
        success: false,
        message: "Bike not found",
      });
    }

    await deleteBikeImage(bike.bannerImage);

    for (const img of bike.galleryImages) {
      await deleteBikeImage(img);
    }

    await bike.deleteOne();

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
    });
  }
});

export default router;
