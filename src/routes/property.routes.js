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
   📄 DOCUMENT MULTI SELECT PARSER
===================================================== */

const parseDocuments = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  /* Already array */
  if (Array.isArray(value)) {
    return value;
  }

  /* JSON array string */
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not JSON → treat as single document
    }

    return [value];
  }

  return [];
};

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
      /* ==============================
         BANNER REQUIRED
      ============================== */

      if (!req.files?.banner) {
        return res.status(400).json({
          success: false,
          message: "Banner image required",
        });
      }

      /* ==============================
         UPLOAD BANNER
      ============================== */

      const bannerImage = await uploadPropertyImage(
        req.files.banner[0],
        "property/banner"
      );

      /* ==============================
         UPLOAD GALLERY
      ============================== */

      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadPropertyImage(img, "property/gallery")
            )
          )
        : [];

      /* ==============================
         UPLOAD AUDIO
      ============================== */

      let audioNote = null;

      if (req.files?.audio) {
        audioNote = await uploadPropertyImage(
          req.files.audio[0],
          "property/audio"
        );
      }

      /* ==============================
         UPLOAD VIDEOS
      ============================== */

      const videos = req.files?.video
        ? await Promise.all(
            req.files.video.map((vid) =>
              uploadPropertyImage(vid, "property/videos")
            )
          )
        : [];

      /* ==============================
         📄 DOCUMENTS MULTI SELECT
      ============================== */

      const documents = parseDocuments(req.body.documents);

      /* ==============================
         CREATE PROPERTY
      ============================== */

      const property = await Property.create({
        ...req.body,

        /* 📄 Documents */
        documents,

        /* 🖼️ Media */
        bannerImage,
        galleryImages,
        audioNote,
        videos,

        videoLink: req.body.videoLink || null,

        /* 👤 User */
        createdBy: req.user.id,

        /* 📌 Status */
        status: "available",
      });

      res.status(201).json({
        success: true,
        message: "Property added successfully",
        property,
      });
    } catch (err) {
      console.log("ADD PROPERTY ERROR:", err);

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

    if (district) {
      query.district = district;
    }

    if (city) {
      query.city = city;
    }

    /* ==============================
       🏠 MAIN TYPE
    ============================== */

    if (mainType) {
      query.mainType = {
        $in: mainType
          .split(",")
          .map((v) => v.trim()),
      };
    }

    /* ==============================
       📂 CATEGORY
    ============================== */

    if (category) {
      query.category = {
        $in: category
          .split(",")
          .map((v) => v.trim()),
      };
    }

    /* ==============================
       🧭 DIRECTION
    ============================== */

    if (direction) {
      query.direction = {
        $in: direction
          .split(",")
          .map((v) => v.trim()),
      };
    }

    /* ==============================
       🛏️ BEDROOMS
    ============================== */

    if (bedrooms) {
      query.bedrooms = {
        $in: bedrooms
          .split(",")
          .map((v) => v.trim()),
      };
    }

    /* ==============================
       💰 PRICE
    ============================== */

    if (minPrice || maxPrice) {
      query.price = {};

      if (minPrice) {
        query.price.$gte = Number(minPrice);
      }

      if (maxPrice) {
        query.price.$lte = Number(maxPrice);
      }
    }

    /* ==============================
       📐 LAND AREA
    ============================== */

    if (minLandArea || maxLandArea) {
      const conditions = [];

      if (minLandArea) {
        conditions.push({
          $gte: [
            {
              $toDouble: {
                $arrayElemAt: [
                  {
                    $split: ["$landArea", " "],
                  },
                  0,
                ],
              },
            },
            Number(minLandArea),
          ],
        });
      }

      if (maxLandArea) {
        conditions.push({
          $lte: [
            {
              $toDouble: {
                $arrayElemAt: [
                  {
                    $split: ["$landArea", " "],
                  },
                  0,
                ],
              },
            },
            Number(maxLandArea),
          ],
        });
      }

      if (conditions.length > 0) {
        query.$expr = {
          $and: conditions,
        };
      }
    }

    /* ==============================
       🚫 STATUS FILTER
    ============================== */

    if (!isAdminUser) {
      query.status = {
        $nin: ["draft", "delete_requested"],
      };
    }

    /* ==============================
       🔍 DEBUG
    ============================== */

    console.log(
      "FINAL QUERY =>",
      JSON.stringify(query, null, 2)
    );

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
      /* ==============================
         FIND PROPERTY
      ============================== */

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
          existingGallery = Array.isArray(
            req.body.existingGallery
          )
            ? req.body.existingGallery
            : JSON.parse(req.body.existingGallery);
        } catch {
          existingGallery = property.galleryImages || [];
        }

        const imagesToDelete = (
          property.galleryImages || []
        ).filter(
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
         AUDIO UPDATE
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
          existingVideos = Array.isArray(
            req.body.existingVideos
          )
            ? req.body.existingVideos
            : JSON.parse(req.body.existingVideos);
        } catch {
          existingVideos = property.videos || [];
        }

        const videosToDelete = (
          property.videos || []
        ).filter(
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

        property.videos = [
          ...(property.videos || []),
          ...newVideos,
        ];
      }

      /* ==============================
         VIDEO LINK UPDATE
      ============================== */

      if (req.body.videoLink !== undefined) {
        property.videoLink =
          req.body.videoLink || null;
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

        /* 📄 DOCUMENTS MULTI SELECT */
        "documents",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          if (field === "documents") {
            property.documents = parseDocuments(
              req.body.documents
            );
          } else {
            property[field] = req.body[field];
          }
        }
      });

      /* ==============================
         SAVE
      ============================== */

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

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const property = await Property.findById(
        req.params.id
      );

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      /* ==============================
         DELETE BANNER
      ============================== */

      if (property.bannerImage) {
        await deletePropertyImage(
          property.bannerImage
        );
      }

      /* ==============================
         DELETE GALLERY
      ============================== */

      for (const img of property.galleryImages) {
        await deletePropertyImage(img);
      }

      /* ==============================
         DELETE AUDIO
      ============================== */

      if (property.audioNote) {
        await deletePropertyImage(
          property.audioNote
        );
      }

      /* ==============================
         DELETE VIDEOS
      ============================== */

      for (const vid of property.videos) {
        await deletePropertyImage(vid);
      }

      /* ==============================
         DELETE PROPERTY
      ============================== */

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
  }
);

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
      /* ==============================
         FIND USER
      ============================== */

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      /* ==============================
         UPLOAD GALLERY
      ============================== */

      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadPropertyImage(
                img,
                "property/gallery"
              )
            )
          )
        : [];

      /* ==============================
         UPLOAD AUDIO
      ============================== */

      let audioNote = null;

      if (req.files?.audio) {
        audioNote = await uploadPropertyImage(
          req.files.audio[0],
          "property/audio"
        );
      }

      /* ==============================
         UPLOAD VIDEOS
      ============================== */

      const videos = req.files?.video
        ? await Promise.all(
            req.files.video.map((vid) =>
              uploadPropertyImage(
                vid,
                "property/videos"
              )
            )
          )
        : [];

      /* ==============================
         📄 DOCUMENTS MULTI SELECT
      ============================== */

      const documents = parseDocuments(
        req.body.documents
      );

      /* ==============================
         CREATE PROPERTY
      ============================== */

      const property = await Property.create({
        ...req.body,

        /* 📄 Documents */
        documents,

        /* 🖼️ Media */
        bannerImage: null,
        galleryImages,
        audioNote,
        videos,

        videoLink:
          req.body.videoLink || null,

        /* 👤 USER */
        seller: String(user.phone),
        sellerUser: user._id,
        createdBy: user._id,

        /* 📌 DRAFT */
        status: "draft",

        price: null,
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
    }).sort({
      createdAt: -1,
    });

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

router.put(
  "/:id/request-delete",
  verifyToken,
  async (req, res) => {
    try {
      const property = await Property.findById(
        req.params.id
      );

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      /* ==============================
         AUTHORIZATION
      ============================== */

      if (
        property.createdBy.toString() !==
        req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized",
        });
      }

      /* ==============================
         REQUEST DELETE
      ============================== */

      await Property.findByIdAndUpdate(
        req.params.id,
        {
          status: "delete_requested",
        },
        {
          new: true,
        }
      );

      res.json({
        success: true,
        message: "Delete request sent",
      });
    } catch (err) {
      console.log(
        "REQUEST DELETE ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message: "Failed to request delete",
      });
    }
  }
);

/* =====================================================
   EXPORT ROUTER
===================================================== */

export default router;