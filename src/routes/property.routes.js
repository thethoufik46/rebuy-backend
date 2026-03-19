// ======================= src/routes/property.routes.js =======================

import express from "express";
import mongoose from "mongoose";
import Property from "../models/property_model.js";
import User from "../models/user_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { verifyTokenOptional } from "../middleware/verifyTokenOptional.js";
import uploadProperty from "../middleware/uploadProperty.js";
import {
  uploadPropertyImage,
  deletePropertyImage,
} from "../utils/propertyUpload.js";

const router = express.Router();

/* =====================================================
   ✅ ADD PROPERTY (ADMIN)
===================================================== */
router.post(
  "/add",
  verifyToken,
  isAdmin,
  uploadProperty.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      if (!req.files?.banner) {
        return res.status(400).json({
          success: false,
          message: "Banner image required",
        });
      }

      // Upload banner
      const bannerImage = await uploadPropertyImage(
        req.files.banner[0],
        "property/banner"
      );

      // Upload gallery images
      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadPropertyImage(img, "property/gallery")
            )
          )
        : [];

      // Upload audio (optional)
      let audioNote = null;
      if (req.files?.audio) {
        audioNote = await uploadPropertyImage(
          req.files.audio[0],
          "property/audio"
        );
      }

      // Upload videos (optional)
      const videos = req.files?.video
        ? await Promise.all(
            req.files.video.map((vid) =>
              uploadPropertyImage(vid, "property/videos")
            )
          )
        : [];

      const property = await Property.create({
        ...req.body,
        bannerImage,
        galleryImages,
        audioNote,
        videos,
        videoLink: req.body.videoLink || null,
        createdBy: req.user.id,
        status: "available",
      });

      res.status(201).json({
        success: true,
        message: "Property added successfully",
        property,
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
   ✅ GET ALL PROPERTIES
===================================================== */
router.get("/", verifyTokenOptional, async (req, res) => {
  try {
    const isAdminUser = req.user?.role === "admin";
    const query = {};

    const {
      district,
      city,
      mainType,
      category,
      direction,
      bedrooms,
      minPrice,
      maxPrice,
      minLandArea,
      maxLandArea,
    } = req.query;

    /* ==============================
       📍 LOCATION
    ============================== */
    if (district) query.district = district;
    if (city) query.city = city;

    /* ==============================
       🏠 MAIN TYPE
    ============================== */
    if (mainType) {
      query.mainType = {
        $in: mainType.split(",").map(v => v.trim())
      };
    }

    /* ==============================
       📂 CATEGORY
    ============================== */
    if (category) {
      query.category = {
        $in: category.split(",").map(v => v.trim())
      };
    }

    /* ==============================
       🧭 DIRECTION
    ============================== */
    if (direction) {
      query.direction = {
        $in: direction.split(",").map(v => v.trim())
      };
    }

    /* ==============================
       🛏️ BEDROOMS
    ============================== */
    if (bedrooms) {
      query.bedrooms = {
        $in: bedrooms.split(",").map(v => v.trim())
      };
    }

    /* ==============================
       💰 PRICE
    ============================== */
    if (minPrice || maxPrice) {
      query.price = {};

      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    /* ==============================
       📐 LAND AREA (SAFE FIX 🔥)
    ============================== */
    if (minLandArea || maxLandArea) {
      const conditions = [];

      if (minLandArea) {
        conditions.push({
          $gte: [
            {
              $toDouble: {
                $arrayElemAt: [
                  { $split: ["$landArea", " "] },
                  0
                ]
              }
            },
            Number(minLandArea)
          ]
        });
      }

      if (maxLandArea) {
        conditions.push({
          $lte: [
            {
              $toDouble: {
                $arrayElemAt: [
                  { $split: ["$landArea", " "] },
                  0
                ]
              }
            },
            Number(maxLandArea)
          ]
        });
      }

      if (conditions.length > 0) {
        query.$expr = { $and: conditions };
      }
    }

    /* ==============================
       🚫 STATUS FILTER
    ============================== */
    if (!isAdminUser) {
      query.status = {
        $nin: ["draft", "delete_requested"]
      };
    }

    /* ==============================
       🔍 DEBUG (IMPORTANT)
    ============================== */
    console.log("FINAL QUERY =>", JSON.stringify(query, null, 2));

    /* ==============================
       📦 FETCH DATA
    ============================== */
    const properties = await Property.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: properties.length,
      properties,
    });

  } catch (err) {
    console.error("FILTER ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
    });
  }
});

/* =====================================================
   ✅ UPDATE PROPERTY (ADMIN SAFE)
===================================================== */
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadProperty.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      /* ==============================
         BANNER UPDATE
      ============================== */
      if (req.files?.banner?.length) {
        if (property.bannerImage) {
          await deletePropertyImage(property.bannerImage);
        }
        property.bannerImage = await uploadPropertyImage(
          req.files.banner[0],
          "property/banner"
        );
      }

      /* ==============================
         GALLERY SAFE UPDATE
      ============================== */
      if (req.body.existingGallery !== undefined) {
        let existingGallery;
        try {
          existingGallery = Array.isArray(req.body.existingGallery)
            ? req.body.existingGallery
            : JSON.parse(req.body.existingGallery);
        } catch {
          existingGallery = property.galleryImages || [];
        }

        const imagesToDelete = (property.galleryImages || []).filter(
          (img) => !existingGallery.includes(img)
        );

        for (const img of imagesToDelete) {
          await deletePropertyImage(img);
        }

        property.galleryImages = existingGallery;
      }

      if (req.files?.gallery?.length) {
        const newGallery = await Promise.all(
          req.files.gallery.map((img) =>
            uploadPropertyImage(img, "property/gallery")
          )
        );
        property.galleryImages = [
          ...(property.galleryImages || []),
          ...newGallery,
        ];
      }

      /* ==============================
         AUDIO UPDATE (replace)
      ============================== */
      if (req.files?.audio?.length) {
        if (property.audioNote) {
          await deletePropertyImage(property.audioNote);
        }
        property.audioNote = await uploadPropertyImage(
          req.files.audio[0],
          "property/audio"
        );
      }

      /* ==============================
         VIDEO SAFE UPDATE
      ============================== */
      if (req.body.existingVideos !== undefined) {
        let existingVideos;
        try {
          existingVideos = Array.isArray(req.body.existingVideos)
            ? req.body.existingVideos
            : JSON.parse(req.body.existingVideos);
        } catch {
          existingVideos = property.videos || [];
        }

        const videosToDelete = (property.videos || []).filter(
          (vid) => !existingVideos.includes(vid)
        );

        for (const vid of videosToDelete) {
          await deletePropertyImage(vid);
        }

        property.videos = existingVideos;
      }

      if (req.files?.video?.length) {
        const newVideos = await Promise.all(
          req.files.video.map((vid) =>
            uploadPropertyImage(vid, "property/videos")
          )
        );
        property.videos = [...(property.videos || []), ...newVideos];
      }

      /* ==============================
         VIDEO LINK UPDATE
      ============================== */
      if (req.body.videoLink !== undefined) {
        property.videoLink = req.body.videoLink || null;
      }

      /* ==============================
         SAFE FIELD UPDATE
      ============================== */
      const allowedFields = [
        "mainType",
        "category",
        "price",
        "yearBuilt",
        "bedrooms",
        "landArea",
        "homeArea",
        "roadAccess",
        "direction",
        "district",
        "city",
        "status",
        "sellerInfo",
        "description",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          property[field] = req.body[field];
        }
      });

      await property.save();

      res.json({
        success: true,
        message: "Property updated successfully",
        property,
      });
    } catch (err) {
      console.log("UPDATE ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Property update failed",
      });
    }
  }
);

/* =====================================================
   ✅ DELETE PROPERTY (ADMIN)
===================================================== */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Delete banner
    if (property.bannerImage) {
      await deletePropertyImage(property.bannerImage);
    }

    // Delete gallery images
    for (const img of property.galleryImages) {
      await deletePropertyImage(img);
    }

    // Delete audio
    if (property.audioNote) {
      await deletePropertyImage(property.audioNote);
    }

    // Delete videos
    for (const vid of property.videos) {
      await deletePropertyImage(vid);
    }

    await property.deleteOne();

    res.json({
      success: true,
      message: "Property deleted successfully",
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
   ✅ USER ADD PROPERTY (DRAFT)
===================================================== */
router.post(
  "/user-add",
  verifyToken,
  uploadProperty.fields([
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Upload gallery
      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadPropertyImage(img, "property/gallery")
            )
          )
        : [];

      // Upload audio
      let audioNote = null;
      if (req.files?.audio) {
        audioNote = await uploadPropertyImage(
          req.files.audio[0],
          "property/audio"
        );
      }

      // Upload videos
      const videos = req.files?.video
        ? await Promise.all(
            req.files.video.map((vid) =>
              uploadPropertyImage(vid, "property/videos")
            )
          )
        : [];

      const property = await Property.create({
        ...req.body,
        bannerImage: null,
        galleryImages,
        audioNote,
        videos,
        videoLink: req.body.videoLink || null,
        seller: String(user.phone),
        sellerUser: user._id,
        createdBy: user._id,
        status: "draft",
        price: null, // optional, user may set later
      });

      res.status(201).json({
        success: true,
        message: "Property submitted for approval",
        property,
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
   ✅ GET MY PROPERTIES
===================================================== */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const properties = await Property.find({
      createdBy: req.user.id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
    });
  }
});

/* =====================================================
   ✅ REQUEST DELETE (USER)
===================================================== */
router.put("/:id/request-delete", verifyToken, async (req, res) => {
  try {

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await Property.findByIdAndUpdate(
      req.params.id,
      { status: "delete_requested" },
      { new: true }
    );

    res.json({
      success: true,
      message: "Delete request sent",
    });

  } catch (err) {

    console.log("REQUEST DELETE ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to request delete",
    });

  }
});

export default router;