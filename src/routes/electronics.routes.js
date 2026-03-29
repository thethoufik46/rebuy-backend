import express from "express";
import mongoose from "mongoose";

import Electronics from "../models/electronics_model.js";
import User from "../models/user_model.js";

import { verifyToken, isAdmin } from "../middleware/auth.js";
import { verifyTokenOptional } from "../middleware/verifyTokenOptional.js";

import uploadElectronics from "../middleware/uploadElectronics.js";

import {
  uploadElectronicsMedia,
  deleteElectronicsMedia,
} from "../utils/electronicsUpload.js";

import { decryptSeller } from "../utils/sellerCrypto.js";

const router = express.Router();

/* =====================================================
   ✅ ADD ELECTRONICS (ADMIN)
===================================================== */
router.post(
  "/add",
  verifyToken,
  isAdmin,
  uploadElectronics.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const { brand, category, videoLink } = req.body;

      /* ❌ REMOVE banner required */

      if (!mongoose.Types.ObjectId.isValid(brand)) {
        return res.status(400).json({ message: "Invalid brand id" });
      }

      if (!category) {
        return res.status(400).json({ message: "Category required" });
      }

      /* ✅ BANNER OPTIONAL */
      let bannerImage = null;

      if (req.files?.banner) {
        bannerImage = await uploadElectronicsMedia(
          req.files.banner[0],
          "electronics/banner"
        );
      }

      /* ✅ GALLERY */
      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadElectronicsMedia(img, "electronics/gallery")
            )
          )
        : [];

      /* ✅ AUDIO */
      let audioNote = null;
      if (req.files?.audio) {
        audioNote = await uploadElectronicsMedia(
          req.files.audio[0],
          "electronics/audio"
        );
      }

      /* ✅ VIDEOS */
      const videos = req.files?.video
        ? await Promise.all(
            req.files.video.map((vid) =>
              uploadElectronicsMedia(vid, "electronics/videos")
            )
          )
        : [];

      /* ✅ CREATE */
      const item = await Electronics.create({
        ...req.body,
        bannerImage,
        galleryImages,
        audioNote,
        videos,
        videoLink: videoLink || null,
        createdBy: req.user._id,
        status: "available",
      });

      res.status(201).json({
        success: true,
        message: "Electronics added successfully",
        item,
      });

    } catch (err) {
      console.log("ADD ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  }
);


/* =====================================================
   ✅ GET ELECTRONICS (FILTER VERSION 🔥)
===================================================== */
router.get("/", verifyTokenOptional, async (req, res) => {
  try {
    const isAdminUser = req.user?.role === "admin";
    const query = {};

    const { category, brand, district, minPrice, maxPrice } = req.query;

    /* CATEGORY */
    if (category) {
      query.category = {
        $in: category.split(",").map((c) => c.trim()),
      };
    }

    /* BRAND */
    if (brand) {
      query.brand = {
        $in: brand.split(",").map((b) => b.trim()),
      };
    }

    /* DISTRICT */
    if (district) {
      query.district = {
        $in: district.split(",").map((d) => d.trim()),
      };
    }

    /* PRICE */
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    /* HIDE DRAFT */
    if (!isAdminUser) {
      query.status = { $nin: ["draft", "delete_requested"] };
    }

    const items = await Electronics.find(query)
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 })
      .lean();

    const finalItems = items.map((item) => {
      if (
        isAdminUser &&
        item.seller?.includes(":")
      ) {
        try {
          item.seller = decryptSeller(item.seller);
        } catch {}
      }
      return item;
    });

    res.json({
      success: true,
      count: finalItems.length,
      items: finalItems,
    });

  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
});

/* =====================================================
   ✅ UPDATE ELECTRONICS (ADMIN)
===================================================== */
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadElectronics.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const item = await Electronics.findById(req.params.id);

      if (!item) {
        return res.status(404).json({ message: "Electronics not found" });
      }

      /* ✅ BANNER */
      if (req.files?.banner?.length) {
        if (item.bannerImage) {
          await deleteElectronicsMedia(item.bannerImage);
        }

        item.bannerImage = await uploadElectronicsMedia(
          req.files.banner[0],
          "electronics/banner"
        );
      }

      /* ✅ GALLERY SAFE UPDATE */
      if (req.body.existingGallery !== undefined) {
        let existingGallery;

        try {
          existingGallery = Array.isArray(req.body.existingGallery)
            ? req.body.existingGallery
            : JSON.parse(req.body.existingGallery);
        } catch {
          existingGallery = item.galleryImages || [];
        }

        if (Array.isArray(existingGallery)) {
          const toDelete = (item.galleryImages || []).filter(
            (img) => !existingGallery.includes(img)
          );

          for (const img of toDelete) {
            await deleteElectronicsMedia(img);
          }

          item.galleryImages = existingGallery;
        }
      }

      if (req.files?.gallery?.length) {
        const newGallery = await Promise.all(
          req.files.gallery.map((img) =>
            uploadElectronicsMedia(img, "electronics/gallery")
          )
        );

        item.galleryImages = [
          ...(item.galleryImages || []),
          ...newGallery,
        ];
      }

      /* ✅ AUDIO */
      if (req.files?.audio?.length) {
        if (item.audioNote) {
          await deleteElectronicsMedia(item.audioNote);
        }

        item.audioNote = await uploadElectronicsMedia(
          req.files.audio[0],
          "electronics/audio"
        );
      }

      /* ✅ VIDEO SAFE UPDATE */
      if (req.body.existingVideos !== undefined) {
        let existingVideos;

        try {
          existingVideos = Array.isArray(req.body.existingVideos)
            ? req.body.existingVideos
            : JSON.parse(req.body.existingVideos);
        } catch {
          existingVideos = item.videos || [];
        }

        if (Array.isArray(existingVideos)) {
          const toDelete = (item.videos || []).filter(
            (v) => !existingVideos.includes(v)
          );

          for (const v of toDelete) {
            await deleteElectronicsMedia(v);
          }

          item.videos = existingVideos;
        }
      }

      if (req.files?.video?.length) {
        const newVideos = await Promise.all(
          req.files.video.map((vid) =>
            uploadElectronicsMedia(vid, "electronics/videos")
          )
        );

        item.videos = [...(item.videos || []), ...newVideos];
      }

      /* ✅ VIDEO LINK */
      if (req.body.videoLink !== undefined) {
        item.videoLink = req.body.videoLink || null;
      }

      /* ✅ SAFE FIELDS */
      const fields = [
        "category",
        "brand",
        "title",
        "description",
        "price",
        "seller",
        "sellerinfo",
        "status",
        "district",
        "city",
      ];

      fields.forEach((f) => {
        if (req.body[f] !== undefined) {
          item[f] = req.body[f];
        }
      });

      await item.save();

      res.json({
        success: true,
        message: "Electronics updated",
        item,
      });

    } catch (err) {
      console.log("UPDATE ERROR:", err);
      res.status(500).json({ message: "Update failed" });
    }
  }
);


/* =====================================================
   ✅ DELETE ELECTRONICS (ADMIN)
===================================================== */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const item = await Electronics.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Electronics not found" });
    }

    if (item.bannerImage) {
      await deleteElectronicsMedia(item.bannerImage);
    }

    if (item.galleryImages?.length) {
      for (const img of item.galleryImages) {
        await deleteElectronicsMedia(img);
      }
    }

    if (item.audioNote) {
      await deleteElectronicsMedia(item.audioNote);
    }

    if (item.videos?.length) {
      for (const v of item.videos) {
        await deleteElectronicsMedia(v);
      }
    }

    await item.deleteOne();

    res.json({
      success: true,
      message: "Electronics deleted",
    });

  } catch (err) {
    console.log("DELETE ERROR:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});


/* =====================================================
   ✅ USER ADD ELECTRONICS (DRAFT FLOW)
===================================================== */
router.post(
  "/user-add",
  verifyToken,
  uploadElectronics.fields([
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 3 },
  ]),
  async (req, res) => {
    try {
      const { brand, category, videoLink } = req.body;

      /* ✅ BRAND VALIDATION */
      if (!mongoose.Types.ObjectId.isValid(brand)) {
        return res.status(400).json({ message: "Invalid brand id" });
      }

      if (!category) {
        return res.status(400).json({ message: "Category required" });
      }

      /* ✅ USER */
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      /* ✅ GALLERY */
      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadElectronicsMedia(img, "electronics/gallery")
            )
          )
        : [];

      /* ✅ AUDIO */
      let audioNote = null;
      if (req.files?.audio) {
        audioNote = await uploadElectronicsMedia(
          req.files.audio[0],
          "electronics/audio"
        );
      }

      /* ✅ VIDEOS */
      const videos = req.files?.video
        ? await Promise.all(
            req.files.video.map((vid) =>
              uploadElectronicsMedia(vid, "electronics/videos")
            )
          )
        : [];

      /* ✅ CREATE */
      const item = await Electronics.create({
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
        message: "Electronics submitted for approval",
        item,
      });

    } catch (err) {
      console.log("USER ADD ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  }
);


/* =====================================================
   ✅ GET MY ELECTRONICS
===================================================== */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const items = await Electronics.find({ createdBy: req.user._id })
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 })
      .lean();

    const safeItems = items.map((item) => {
      if (
        typeof item.seller === "string" &&
        item.seller.includes(":")
      ) {
        item.seller = "**********";
      }
      return item;
    });

    res.json({
      success: true,
      count: safeItems.length,
      items: safeItems,
    });

  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
});


/* =====================================================
   ✅ REQUEST DELETE
===================================================== */
router.put("/:id/request-delete", verifyToken, async (req, res) => {
  try {
    const item = await Electronics.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Electronics not found" });
    }

    if (item.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    item.status = "delete_requested";
    await item.save();

    res.json({
      success: true,
      message: "Delete request sent",
    });

  } catch (err) {
    res.status(500).json({ message: "Request failed" });
  }
});

export default router;


