// ======================= src/routes/property.routes.js =======================

import express from "express";
import mongoose from "mongoose";
import Property from "../models/property_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import uploadProperty from "../middleware/uploadProperty.js";
import {
  uploadPropertyImage,
  deletePropertyImage,
} from "../utils/propertyUpload.js";

const router = express.Router();

/* ======================
   ADD PROPERTY
====================== */
router.post(
  "/add",
  verifyToken,
  isAdmin,
  uploadProperty.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const bannerImage = await uploadPropertyImage(
        req.files.banner[0],
        "property/banner"
      );

      const galleryImages = req.files.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadPropertyImage(img, "property/gallery")
            )
          )
        : [];

      const property = await Property.create({
        ...req.body,
        // ✅ FINAL FIX
        location: `${req.body.district}, ${req.body.town}`,
        bannerImage,
        galleryImages,
      });

      return res.status(201).json({
        success: true,
        property,
      });
    } catch (err) {
      console.log("ADD PROPERTY ERROR:", err);
      return res.status(500).json({ success: false });
    }
  }
);

/* ======================
   GET ALL PROPERTIES
====================== */
router.get("/", async (req, res) => {
  try {
    const {
      mainType,
      category,
      minPrice,
      maxPrice,
      location,
      status,
      bedrooms,
    } = req.query;

    const query = {};

    if (mainType) query.mainType = mainType;
    if (category) query.category = category;
    if (location) query.location = location;
    if (status) query.status = status;
    if (bedrooms) query.bedrooms = Number(bedrooms);

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const properties = await Property.find(query).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (err) {
    console.error("PROPERTY FETCH ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
    });
  }
});

/* ======================
   UPDATE PROPERTY
====================== */
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadProperty.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid property id",
        });
      }

      const property = await Property.findById(req.params.id);
      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      /* ======================
         BANNER UPDATE
      ====================== */
      if (req.files?.banner) {
        if (property.bannerImage) {
          await deletePropertyImage(property.bannerImage);
        }

        property.bannerImage = await uploadPropertyImage(
          req.files.banner[0],
          "property/banner"
        );
      }

      /* ======================
         EXISTING GALLERY
      ====================== */
      let existingGallery = [];

      if (req.body.existingGallery) {
        existingGallery = Array.isArray(req.body.existingGallery)
          ? req.body.existingGallery
          : JSON.parse(req.body.existingGallery);
      }

      // delete removed images
      for (const img of property.galleryImages) {
        if (!existingGallery.includes(img)) {
          await deletePropertyImage(img);
        }
      }

      /* ======================
         NEW GALLERY
      ====================== */
      let newGallery = [];

      if (req.files?.gallery) {
        newGallery = await Promise.all(
          req.files.gallery.map((img) =>
            uploadPropertyImage(img, "property/gallery")
          )
        );
      }

      property.galleryImages = [...existingGallery, ...newGallery];

      /* ======================
         SAFE BODY UPDATE
      ====================== */
      const {
        existingGallery: _eg,
        banner,
        gallery,
        ...safeBody
      } = req.body;

      Object.assign(property, safeBody);

      await property.save();

      return res.status(200).json({
        success: true,
        property,
      });
    } catch (err) {
      console.error("UPDATE PROPERTY ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Property update failed",
      });
    }
  }
);

/* ======================
   DELETE PROPERTY
====================== */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false });
    }

    await deletePropertyImage(property.bannerImage);

    for (const img of property.galleryImages) {
      await deletePropertyImage(img);
    }

    await property.deleteOne();

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE PROPERTY ERROR:", err);
    return res.status(500).json({ success: false });
  }
});

export default router;
