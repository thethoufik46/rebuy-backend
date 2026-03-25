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
   ADD BIKE (ADMIN) - with full validation
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
      const {
        brand,
        model,
        variant,
        videoLink,
        seller,
        sellerinfo,
        year,
        owner,
        district
      } = req.body;

      const yearNumber = Number(year);

      if (!year || isNaN(yearNumber)) {
        return res.status(400).json({
          success: false,
          message: "Valid year required"
        });
      }

      if (!owner) {
        return res.status(400).json({
          success: false,
          message: "Owner required"
        });
      }

      if (!district || district.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "District required"
        });
      }
      // Required checks
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


      if (!seller) {
        return res.status(400).json({
          success: false,
          message: "Seller phone number is required",
        });
      }

      if (!sellerinfo) {
        return res.status(400).json({
          success: false,
          message: "Seller info (Rc owner/Dealer/Verified) is required",
        });
      }

      // Upload files
      const bannerImage = await uploadBikeImage(
        req.files.banner[0],
        "bikes/banner"
      );

      const galleryImages = req.files?.gallery
        ? await Promise.all(
          req.files.gallery.map((img) =>
            uploadBikeImage(img, "bikes/gallery")
          )
        )
        : [];

      let audioNote = null;
      if (req.files?.audio) {
        audioNote = await uploadBikeImage(
          req.files.audio[0],
          "bikes/audio"
        );
      }

      const videos = req.files?.video
        ? await Promise.all(
          req.files.video.map((vid) =>
            uploadBikeImage(vid, "bikes/videos")
          )
        )
        : [];

      // Create bike
      const bike = await Bike.create({
        ...req.body,
        brand,
        model: model && mongoose.Types.ObjectId.isValid(model)
          ? model
          : null,
        variant: variant || null,
        bannerImage,
        galleryImages,
        audioNote,
        videos,
        videoLink: videoLink || null,
        seller,                // explicitly passed
        sellerinfo,            // explicitly passed
        createdBy: req.user.id,
        status: "available",
      });

      res.status(201).json({
        success: true,
        message: "Bike added successfully",
        bike,
      });
    } catch (err) {
      console.error("ADMIN ADD BIKE ERROR:", err);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/* =====================================================
   ✅ GET ALL BIKES (FILTER: BRAND, MODEL, DISTRICT, OWNER, YEAR, PRICE)
===================================================== */
router.get("/", verifyTokenOptional, async (req, res) => {
  try {

    const isAdminUser = req.user?.role === "admin";

    const query = {};

    const {
      brand,
      model,
      owner,
      district,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
    } = req.query;

    /* ===============================
       🔎 FILTERS
    =============================== */

    if (brand) query.brand = brand;

    if (model) query.model = model;

    if (district) query.district = district;

    if (owner) {
      query.owner = {
        $in: owner.split(",")
      };
    }

    /* ===============================
       💰 PRICE FILTER
    =============================== */

    if (minPrice || maxPrice) {

      query.price = {};

      if (minPrice) query.price.$gte = Number(minPrice);

      if (maxPrice) query.price.$lte = Number(maxPrice);

    }

    /* ===============================
       📅 YEAR FILTER
    =============================== */

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
      .populate("model", "title")
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

        } catch (_) { }

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

    console.error("GET BIKES ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bikes",
    });

  }
});

/* =====================================================
   UPDATE BIKE (ADMIN) - safe field updates
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
      if (!bike) {
        return res.status(404).json({
          success: false,
          message: "Bike not found",
        });
      }

      // Banner update
      if (req.files?.banner?.length) {
        if (bike.bannerImage) {
          await deleteBikeImage(bike.bannerImage);
        }
        bike.bannerImage = await uploadBikeImage(
          req.files.banner[0],
          "bikes/banner"
        );
      }

      // Gallery update
      if (req.body.existingGallery !== undefined) {
        let existingGallery;
        try {
          existingGallery = Array.isArray(req.body.existingGallery)
            ? req.body.existingGallery
            : JSON.parse(req.body.existingGallery);
        } catch {
          existingGallery = bike.galleryImages || [];
        }
        if (Array.isArray(existingGallery)) {
          const imagesToDelete = (bike.galleryImages || []).filter(
            (img) => !existingGallery.includes(img)
          );
          for (const img of imagesToDelete) {
            await deleteBikeImage(img);
          }
          bike.galleryImages = existingGallery;
        }
      }

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

      // Audio update
      if (req.files?.audio?.length) {
        if (bike.audioNote) {
          await deleteBikeImage(bike.audioNote);
        }
        bike.audioNote = await uploadBikeImage(
          req.files.audio[0],
          "bikes/audio"
        );
      }

      // Video files update
      if (req.body.existingVideos !== undefined) {
        let existingVideos;
        try {
          existingVideos = Array.isArray(req.body.existingVideos)
            ? req.body.existingVideos
            : JSON.parse(req.body.existingVideos);
        } catch {
          existingVideos = bike.videos || [];
        }
        if (Array.isArray(existingVideos)) {
          const videosToDelete = (bike.videos || []).filter(
            (vid) => !existingVideos.includes(vid)
          );
          for (const vid of videosToDelete) {
            await deleteBikeImage(vid);
          }
          bike.videos = existingVideos;
        }
      }

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

      // Video link
      if (req.body.videoLink !== undefined) {
        bike.videoLink = req.body.videoLink || null;
      }

      // Allowed simple fields (seller included, pre-save hook will encrypt)
      const allowedFields = [
        "brand",
        "variant",
        "year",
        "price",
        "km",
        "owner",
        "insurance",
        "status",
        "seller",
        "sellerinfo",
        "district",
        "city",
        "description",
      ];

     if (req.body.model !== undefined) {
  bike.model =
    req.body.model && mongoose.Types.ObjectId.isValid(req.body.model)
      ? req.body.model
      : null;
}

      await bike.save();

      res.json({
        success: true,
        message: "Bike updated successfully",
        bike,
      });
    } catch (err) {
      console.error("BIKE UPDATE ERROR FULL:", err);
      res.status(500).json({
        success: false,
        message: "Bike update failed",
      });
    }
  }
);

/* =====================================================
   DELETE BIKE (ADMIN)
===================================================== */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike) {
      return res.status(404).json({
        success: false,
        message: "Bike not found",
      });
    }

    // Delete associated files
    if (bike.bannerImage) await deleteBikeImage(bike.bannerImage);
    for (const img of bike.galleryImages || []) await deleteBikeImage(img);
    if (bike.audioNote) await deleteBikeImage(bike.audioNote);
    for (const vid of bike.videos || []) await deleteBikeImage(vid);

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
   USER ADD BIKE (DRAFT FLOW)
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
      const { brand, model, variant, videoLink } = req.body;

      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(brand)) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand id",
        });
      }


      // Get user
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Upload files
      const galleryImages = req.files?.gallery
        ? await Promise.all(
          req.files.gallery.map((img) =>
            uploadBikeImage(img, "bikes/gallery")
          )
        )
        : [];

      let audioNote = null;
      if (req.files?.audio) {
        audioNote = await uploadBikeImage(
          req.files.audio[0],
          "bikes/audio"
        );
      }

      const videos = req.files?.video
        ? await Promise.all(
          req.files.video.map((vid) =>
            uploadBikeImage(vid, "bikes/videos")
          )
        )
        : [];

      // Create bike (draft)
      const bike = await Bike.create({
        ...req.body,
        brand,
        model: model && mongoose.Types.ObjectId.isValid(model)
          ? model
          : null, variant: variant || null,
        bannerImage: null,
        galleryImages,
        audioNote,
        videos,
        videoLink: videoLink || null,
        seller: String(user.phone),           // from user profile
        sellerUser: user._id,
        createdBy: user._id,
        status: "draft",
        price: null,                           // admin will set later
        sellerinfo: req.body.sellerinfo ?? "Rc owner", // default using nullish coalescing
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
   GET MY BIKES (USER LISTINGS)
===================================================== */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const bikes = await Bike.find({ createdBy: userId })
      .populate("brand", "name logoUrl")
      .populate("model", "title")
      .sort({ createdAt: -1 })
      .lean();

    // Mask seller phone for non-admin (user sees own listings, but still mask)
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
   USER REQUEST DELETE (BIKE)
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