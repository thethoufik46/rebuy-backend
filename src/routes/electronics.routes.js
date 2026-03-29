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

                /* 🔴 VALIDATION */
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

                if (!category) {
                    return res.status(400).json({
                        success: false,
                        message: "Category required",
                    });
                }

                /* 🔥 UPLOAD BANNER */
                const bannerImage = await uploadElectronicsMedia(
                    req.files.banner[0],
                    "electronics/banner"
                );

                /* 🔥 UPLOAD GALLERY */
                const galleryImages = req.files?.gallery
                    ? await Promise.all(
                        req.files.gallery.map((img) =>
                            uploadElectronicsMedia(img, "electronics/gallery")
                        )
                    )
                    : [];

                /* 🔥 AUDIO */
                let audioNote = null;
                if (req.files?.audio) {
                    audioNote = await uploadElectronicsMedia(
                        req.files.audio[0],
                        "electronics/audio"
                    );
                }

                /* 🔥 VIDEOS */
                const videos = req.files?.video
                    ? await Promise.all(
                        req.files.video.map((vid) =>
                            uploadElectronicsMedia(vid, "electronics/videos")
                        )
                    )
                    : [];

                /* 🔥 CREATE ITEM */
                const item = await Electronics.create({
                    ...req.body,
                    bannerImage,
                    galleryImages,
                    audioNote,
                    videos,
                    videoLink: videoLink || null,
                    createdBy: req.user.id,
                    status: "available",
                });

                return res.status(201).json({
                    success: true,
                    message: "Electronics added successfully",
                    item,
                });
            } catch (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message,
                });
            }
        }
    );



    // /get

    router.get("/", verifyTokenOptional, async (req, res) => {
        try {
            const isAdminUser = req.user?.role === "admin";
            const query = {};

            const {
                category,
                brand,
                minPrice,
                maxPrice,
            } = req.query;

            /* ==============================
            ✅ CATEGORY FILTER
            ============================== */
            if (category) {
                query.category = {
                    $in: category.split(",").map((c) => c.trim()),
                };
            }

            /* ==============================
            ✅ MULTI BRAND FILTER
            ============================== */
            if (brand) {
                query.brand = {
                    $in: brand.split(",").map((b) => b.trim()),
                };
            }

            /* ==============================
            ✅ PRICE FILTER
            ============================== */
            if (minPrice || maxPrice) {
                query.price = {};
                if (minPrice) query.price.$gte = Number(minPrice);
                if (maxPrice) query.price.$lte = Number(maxPrice);
            }

            /* ==============================
            ✅ HIDE DRAFT FOR USERS
            ============================== */
            if (!isAdminUser) {
                query.status = { $nin: ["draft", "delete_requested"] };
            }

            /* ==============================
            ✅ FETCH DATA
            ============================== */
            const items = await Electronics.find(query)
                .populate("brand", "name logoUrl")
                .sort({ createdAt: -1 })
                .lean();

            /* ==============================
            ✅ DECRYPT SELLER (ADMIN ONLY)
            ============================== */
            const finalItems = items.map((item) => {
                if (
                    isAdminUser &&
                    typeof item.seller === "string" &&
                    item.seller.includes(":")
                ) {
                    try {
                        item.seller = decryptSeller(item.seller);
                    } catch (_) { }
                }
                return item;
            });

            /* ==============================
            ✅ RESPONSE
            ============================== */
            res.json({
                success: true,
                count: finalItems.length,
                items: finalItems,
            });

        } catch (err) {
            console.log("GET ELECTRONICS ERROR:", err);

            res.status(500).json({
                success: false,
                message: "Failed to fetch electronics",
            });
        }
    });


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
        return res.status(404).json({
          success: false,
          message: "Electronics not found",
        });
      }

      /* =====================================================
         ✅ BANNER UPDATE (REPLACE SAFE)
      ===================================================== */
      if (req.files?.banner?.length) {
        if (item.bannerImage) {
          await deleteElectronicsMedia(item.bannerImage);
        }

        item.bannerImage = await uploadElectronicsMedia(
          req.files.banner[0],
          "electronics/banner"
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
          existingGallery = item.galleryImages || [];
        }

        if (Array.isArray(existingGallery)) {
          const imagesToDelete = (item.galleryImages || []).filter(
            (img) => !existingGallery.includes(img)
          );

          for (const img of imagesToDelete) {
            await deleteElectronicsMedia(img);
          }

          item.galleryImages = existingGallery;
        }
      }

      // Append new gallery images
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

      /* =====================================================
         ✅ AUDIO UPDATE (REPLACE SAFE)
      ===================================================== */
      if (req.files?.audio?.length) {
        if (item.audioNote) {
          await deleteElectronicsMedia(item.audioNote);
        }

        item.audioNote = await uploadElectronicsMedia(
          req.files.audio[0],
          "electronics/audio"
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
          existingVideos = item.videos || [];
        }

        if (Array.isArray(existingVideos)) {
          const videosToDelete = (item.videos || []).filter(
            (vid) => !existingVideos.includes(vid)
          );

          for (const vid of videosToDelete) {
            await deleteElectronicsMedia(vid);
          }

          item.videos = existingVideos;
        }
      }

      // Append new videos
      if (req.files?.video?.length) {
        const newVideos = await Promise.all(
          req.files.video.map((vid) =>
            uploadElectronicsMedia(vid, "electronics/videos")
          )
        );

        item.videos = [
          ...(item.videos || []),
          ...newVideos,
        ];
      }

      /* =====================================================
         ✅ VIDEO LINK UPDATE
      ===================================================== */
      if (req.body.videoLink !== undefined) {
        item.videoLink = req.body.videoLink || null;
      }

      /* =====================================================
         ✅ SAFE FIELD UPDATE
      ===================================================== */
      const allowedFields = [
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

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          item[field] = req.body[field];
        }
      });

      /* =====================================================
         ✅ CATEGORY → BRAND MODEL FIX
      ===================================================== */
      if (req.body.category) {
        const map = {
          mobile: "MobileBrand",
          laptop: "LaptopBrand",
          pc: "PcBrand",
        };

        item.brandModel = map[req.body.category];
      }

      await item.save();

      res.json({
        success: true,
        message: "Electronics updated successfully",
        item,
      });

    } catch (err) {
      console.log("UPDATE ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Electronics update failed",
      });
    }
  }
);



    router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
        try {
            const item = await Electronics.findById(req.params.id);

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: "Electronics not found",
                });
            }

            /* 🔥 DELETE BANNER */
            if (item.bannerImage) {
                await deleteElectronicsMedia(item.bannerImage);
            }

            /* 🔥 DELETE GALLERY */
            if (item.galleryImages?.length) {
                for (const img of item.galleryImages) {
                    await deleteElectronicsMedia(img);
                }
            }

            /* 🔥 DELETE AUDIO */
            if (item.audioNote) {
                await deleteElectronicsMedia(item.audioNote);
            }

            /* 🔥 DELETE VIDEOS */
            if (item.videos?.length) {
                for (const v of item.videos) {
                    await deleteElectronicsMedia(v);
                }
            }

            await item.deleteOne();

            res.json({
                success: true,
                message: "Electronics deleted successfully",
            });
        } catch (err) {
            console.log("DELETE ERROR:", err);
            res.status(500).json({
                success: false,
                message: "Delete failed",
            });
        }
    });


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

                /* =========================
                ✅ BRAND VALIDATION
                ========================= */
                if (!mongoose.Types.ObjectId.isValid(brand)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid brand id",
                    });
                }

                if (!category) {
                    return res.status(400).json({
                        success: false,
                        message: "Category required",
                    });
                }

                /* =========================
                ✅ FIND USER
                ========================= */
                const user = await User.findById(req.user.id);

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: "User not found",
                    });
                }

                /* =========================
                ✅ GALLERY
                ========================= */
                const galleryImages = req.files?.gallery
                    ? await Promise.all(
                        req.files.gallery.map((img) =>
                            uploadElectronicsMedia(img, "electronics/gallery")
                        )
                    )
                    : [];

                /* =========================
                ✅ AUDIO
                ========================= */
                let audioNote = null;
                if (req.files?.audio) {
                    audioNote = await uploadElectronicsMedia(
                        req.files.audio[0],
                        "electronics/audio"
                    );
                }

                /* =========================
                ✅ VIDEOS
                ========================= */
                const videos = req.files?.video
                    ? await Promise.all(
                        req.files.video.map((vid) =>
                            uploadElectronicsMedia(vid, "electronics/videos")
                        )
                    )
                    : [];

                /* =========================
                ✅ CREATE
                ========================= */
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

                res.status(500).json({
                    success: false,
                    message: err.message,
                });
            }
        }
    );



    router.get("/my", verifyToken, async (req, res) => {
        try {
            const userId = req.user.id;

            const items = await Electronics.find({ createdBy: userId })
                .populate("brand", "name logoUrl")
                .sort({ createdAt: -1 })
                .lean();

            /* 🔒 MASK SELLER */
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
            res.status(500).json({
                success: false,
                message: "Failed to fetch electronics",
            });
        }
    });



    router.put("/:id/request-delete", verifyToken, async (req, res) => {
        try {
            const item = await Electronics.findById(req.params.id);

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: "Electronics not found",
                });
            }

            /* 🔒 OWNER CHECK */
            if (item.createdBy.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            item.status = "delete_requested";
            await item.save();

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

