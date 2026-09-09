// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import express from "express";
import mongoose from "mongoose";
import Bike from "../../models/bike/bike_model.js";
import User from "../../models/user_model.js";
import BikeBrand from "../../models/bike/brand/bike_brand_model.js";
import BikeModel from "../../models/bike/model/bike_model_model.js";
import BikeVariant from "../../models/bike/variant/bike_variant_model.js";
import { verifyToken } from "../../middleware/auth.js";
import { verifyTokenOptional } from "../../middleware/verifyTokenOptional.js";
import uploadBike from "../../middleware/bike/uploadBike.js";
import {
  uploadBikeImage,
  deleteBikeImage,
} from "../../utils/bike/bikeUpload.js";
import {
  encryptSeller,
  decryptSeller,
} from "../../utils/sellerCrypto.js";
const router = express.Router();
/* ============================================================
   SELLER RESPONSE
============================================================ */
const prepareSellerForResponse = (
  bike,
  isAdminUser = false,
  isOwner = false
) => {
  if (!bike) return bike;
  if (!isAdminUser && !isOwner) {
    delete bike.seller;
    return bike;
  }
  if (
    typeof bike.seller === "string" &&
    bike.seller.includes(":")
  ) {
    try {
      bike.seller = decryptSeller(bike.seller);
    } catch (_) {}
  }
  return bike;
};
/* ============================================================
   REGISTRATION STATES
============================================================ */
const REGISTRATION_STATES = [
  "TN",
  "AP",
  "AR",
  "AS",
  "BR",
  "CG",
  "GA",
  "GJ",
  "HR",
  "HP",
  "JH",
  "KA",
  "KL",
  "MP",
  "MH",
  "MN",
  "ML",
  "MZ",
  "NL",
  "OD",
  "PB",
  "RJ",
  "SK",
  "TS",
  "TR",
  "UP",
  "UK",
  "WB",
  "AN",
  "CH",
  "DN",
  "DL",
  "JK",
  "LA",
  "LD",
  "PY",
];
/* ============================================================
   REGISTRATION VALIDATION
============================================================ */
const validateRegistration = (
  state,
  number
) => {
  const registrationState =
    String(state || "TN")
      .trim()
      .toUpperCase();
  const registrationNumber =
    String(number || "").trim();
  if (
    !REGISTRATION_STATES.includes(
      registrationState
    )
  ) {
    throw new Error(
      "Invalid registration state"
    );
  }
  if (
    !/^[0-9]{2}$/.test(
      registrationNumber
    )
  ) {
    throw new Error(
      "Registration number must contain exactly 2 digits"
    );
  }
  return {
    registrationState,
    registrationNumber,
  };
};
/* ============================================================
   BIKE BRAND / MODEL / VARIANT VALIDATION
   BRAND  = REQUIRED
   MODEL  = OPTIONAL
   VARIANT = OPTIONAL
============================================================ */
const validateBikeHierarchy = async (
  brand,
  model,
  variant = null
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      brand
    )
  ) {
    throw new Error(
      "Invalid brand id"
    );
  }
  const brandDoc =
    await BikeBrand.findById(brand)
      .select("_id")
      .lean();
  if (!brandDoc) {
    throw new Error("Brand not found");
  }
  if (!model) {
    if (variant) {
      throw new Error(
        "Variant cannot be selected without a model"
      );
    }
    return;
  }
  if (
    !mongoose.Types.ObjectId.isValid(
      model
    )
  ) {
    throw new Error(
      "Invalid model id"
    );
  }
  const modelDoc =
    await BikeModel.findById(model)
      .select("_id brand")
      .lean();
  if (!modelDoc) {
    throw new Error("Model not found");
  }
  const modelBrandId =
    modelDoc.brand;
  if (
    modelBrandId &&
    modelBrandId.toString() !==
      brand.toString()
  ) {
    throw new Error(
      "Selected model does not belong to selected brand"
    );
  }
  if (variant) {
    if (
      !mongoose.Types.ObjectId.isValid(
        variant
      )
    ) {
      throw new Error(
        "Invalid variant id"
      );
    }
    const variantDoc =
      await BikeVariant.findById(
        variant
      )
        .select("_id model")
        .lean();
    if (!variantDoc) {
      throw new Error(
        "Variant not found"
      );
    }
    const variantModelId =
      variantDoc.model;
    if (
      variantModelId &&
      variantModelId.toString() !==
        model.toString()
    ) {
      throw new Error(
        "Selected variant does not belong to selected model"
      );
    }
  }
};
/* ============================================================
   MEDIA UPLOAD
============================================================ */
const uploadBikeMedia = async (
  files
) => {
  const bannerImage =
    files?.banner?.length
      ? await uploadBikeImage(
          files.banner[0],
          "bikes/banner"
        )
      : null;
  const galleryImages =
    files?.gallery?.length
      ? await Promise.all(
          files.gallery.map(
            (file) =>
              uploadBikeImage(
                file,
                "bikes/gallery"
              )
          )
        )
      : [];
  const audioNote =
    files?.audio?.length
      ? await uploadBikeImage(
          files.audio[0],
          "bikes/audio"
        )
      : null;
  const videoFiles = [
    ...(files?.video || []),
    ...(files?.videos || []),
  ];
  const videos =
    videoFiles.length
      ? await Promise.all(
          videoFiles.map(
            (file) =>
              uploadBikeImage(
                file,
                "bikes/videos"
              )
          )
        )
      : [];
  return {
    bannerImage,
    galleryImages,
    audioNote,
    videos,
  };
};
/* ============================================================
   SAFE MEDIA DELETE
============================================================ */
const safeDeleteMedia = async (
  media
) => {
  if (
    typeof media !== "string" ||
    !media.trim()
  ) {
    return;
  }
  try {
    await deleteBikeImage(media);
  } catch (error) {
    console.error(
      "BIKE MEDIA DELETE ERROR:",
      error.message
    );
  }
};
/* ============================================================
   GET ALL PUBLIC BIKES
============================================================ */
router.get(
  "/",
  verifyTokenOptional,
  async (req, res) => {
    try {
      const {
        brand,
        model,
        variant,
        status,
        district,
        city,
        insurance,
        search,
        minPrice,
        maxPrice,
        minYear,
        maxYear,
        registrationState,
        registrationNumber,
      } = req.query;
      const filter = {};
      if (brand) {
        filter.brand = brand;
      }
      if (model) {
        filter.model = model;
      }
      if (variant) {
        filter.variant = variant;
      }
      if (status) {
        filter.status = status;
      } else if (
        !req.user ||
        req.user.role !== "admin"
      ) {
        filter.status = {
          $nin: [
            "draft",
            "delete_requested",
          ],
        };
      }
      if (district) {
        filter.district = district;
      }
      if (city) {
        filter.city = city;
      }
      if (insurance) {
        filter.insurance = insurance;
      }
      if (
        minPrice ||
        maxPrice
      ) {
        filter.price = {};
        if (
          minPrice !== undefined &&
          minPrice !== ""
        ) {
          filter.price.$gte =
            Number(minPrice);
        }
        if (
          maxPrice !== undefined &&
          maxPrice !== ""
        ) {
          filter.price.$lte =
            Number(maxPrice);
        }
      }
      if (
        minYear ||
        maxYear
      ) {
        filter.year = {};
        if (
          minYear !== undefined &&
          minYear !== ""
        ) {
          filter.year.$gte =
            Number(minYear);
        }
        if (
          maxYear !== undefined &&
          maxYear !== ""
        ) {
          filter.year.$lte =
            Number(maxYear);
        }
      }
      if (registrationState) {
        filter.registrationState =
          String(
            registrationState
          )
            .trim()
            .toUpperCase();
      }
      if (registrationNumber) {
        filter.registrationNumber =
          String(
            registrationNumber
          ).trim();
      }
      if (search) {
        filter.$or = [
          {
            description: {
              $regex: search,
              $options: "i",
            },
          },
          {
            district: {
              $regex: search,
              $options: "i",
            },
          },
          {
            city: {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }
      const bikes =
        await Bike.find(filter)
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id brand title imageUrl"
          )
          .populate(
            "variant",
            "_id model title imageUrl"
          )
          .sort({
            createdAt: -1,
          })
          .lean();
      const isAdminUser =
        !!req.user &&
        req.user.role === "admin";
      const result = bikes.map(
        (bike) =>
          prepareSellerForResponse(
            bike,
            isAdminUser,
            false
          )
      );
      return res.json({
        success: true,
        count: result.length,
        bikes: result,
      });
    } catch (error) {
      console.error(
        "GET BIKES ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get bikes",
      });
    }
  }
);
/* ============================================================
   GET MY BIKES
   MUST COME BEFORE /:id
============================================================ */
router.get(
  "/my",
  verifyToken,
  async (req, res) => {
    try {
      const bikes =
        await Bike.find({
          $or: [
            {
              createdBy:
                req.user.id,
            },
            {
              sellerUser:
                req.user.id,
            },
          ],
        })
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id brand title imageUrl"
          )
          .populate(
            "variant",
            "_id model title imageUrl"
          )
          .sort({
            createdAt: -1,
          })
          .lean();
      const result = bikes.map(
        (bike) => {
          const item = {
            ...bike,
          };
          if (
            typeof item.seller ===
              "string" &&
            item.seller.includes(":")
          ) {
            try {
              item.seller =
                decryptSeller(
                  item.seller
                );
            } catch (_) {}
          }
          return item;
        }
      );
      return res.json({
        success: true,
        count: result.length,
        bikes: result,
      });
    } catch (error) {
      console.error(
        "GET MY BIKES ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get my bikes",
      });
    }
  }
);
/* ============================================================
   USER ADD BIKE
   POST /api/bikes/user-add
   POST /api/bikes/
============================================================ */
router.post(
  ["/user-add", "/"],
  verifyToken,
  uploadBike.fields([
    {
      name: "banner",
      maxCount: 1,
    },
    {
      name: "gallery",
      maxCount: 20,
    },
    {
      name: "audio",
      maxCount: 1,
    },
    {
      name: "video",
      maxCount: 10,
    },
    {
      name: "videos",
      maxCount: 10,
    },
  ]),
  async (req, res) => {
    try {
      const {
        brand,
        model,
        variant,
        videoLink,
        registrationState,
        registrationNumber,
        year,
        price,
        km,
        insurance,
        status,
        seller,
        sellerinfo,
        district,
        city,
        description,
      } = req.body;
      await validateBikeHierarchy(
        brand,
        model || null,
        variant || null
      );
      const registration =
        validateRegistration(
          registrationState,
          registrationNumber
        );
      const bikeData = {
        brand,
        model:
          model || null,
        variant:
          variant || null,
        registrationState:
          registration.registrationState,
        registrationNumber:
          registration.registrationNumber,
        year,
        price:
          price === "" ||
          price === undefined
            ? null
            : price,
        km:
          km === "" ||
          km === undefined
            ? null
            : km,
        insurance:
          insurance || null,
        status:
          status || "draft",
        seller:
          seller &&
          String(seller).trim()
            ? encryptSeller(
                String(
                  seller
                ).trim()
              )
            : req.user.phone
              ? encryptSeller(
                  String(
                    req.user.phone
                  ).trim()
                )
              : null,
        sellerUser:
          req.user.id,
        sellerinfo:
          sellerinfo ||
          "Rc owner",
        district,
        city:
          city || null,
        description:
          description || null,
        videoLink:
          videoLink || null,
        createdBy:
          req.user.id,
      };
      const {
        bannerImage,
        galleryImages,
        audioNote,
        videos,
      } =
        await uploadBikeMedia(
          req.files
        );
      bikeData.bannerImage =
        bannerImage;
      bikeData.galleryImages =
        galleryImages;
      bikeData.audioNote =
        audioNote;
      bikeData.videos =
        videos;
      const bike =
        await Bike.create(
          bikeData
        );
      const responseBike =
        bike.toObject();
      prepareSellerForResponse(
        responseBike,
        false,
        true
      );
      return res.status(201).json({
        success: true,
        message:
          "Bike created successfully",
        bike: responseBike,
      });
    } catch (error) {
      console.error(
        "USER CREATE BIKE ERROR:",
        error
      );
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to create bike",
      });
    }
  }
);
/* ============================================================
   GET BIKE BY ID
============================================================ */
router.get(
  "/:id",
  verifyTokenOptional,
  async (req, res) => {
    try {
      const { id } =
        req.params;
      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid bike id",
        });
      }
      const bike =
        await Bike.findById(id)
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id brand title imageUrl"
          )
          .populate(
            "variant",
            "_id model title imageUrl"
          )
          .lean();
      if (!bike) {
        return res.status(404).json({
          success: false,
          message:
            "Bike not found",
        });
      }
      const isAdminUser =
        !!req.user &&
        req.user.role === "admin";
      const isOwner =
        !!req.user &&
        (
          (
            bike.createdBy &&
            bike.createdBy.toString() ===
              req.user.id.toString()
          ) ||
          (
            bike.sellerUser &&
            bike.sellerUser.toString() ===
              req.user.id.toString()
          )
        );
      if (
        !isAdminUser &&
        !isOwner &&
        (
          bike.status === "draft" ||
          bike.status ===
            "delete_requested"
        )
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Bike not found",
        });
      }
      prepareSellerForResponse(
        bike,
        isAdminUser,
        isOwner
      );
      return res.json({
        success: true,
        bike,
      });
    } catch (error) {
      console.error(
        "GET BIKE BY ID ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get bike",
      });
    }
  }
);
/* ============================================================
   USER / OWNER UPDATE BIKE
   PUT /api/bikes/:id
============================================================ */
router.put(
  "/:id",
  verifyToken,
  uploadBike.fields([
    {
      name: "banner",
      maxCount: 1,
    },
    {
      name: "gallery",
      maxCount: 20,
    },
    {
      name: "audio",
      maxCount: 1,
    },
    {
      name: "video",
      maxCount: 10,
    },
    {
      name: "videos",
      maxCount: 10,
    },
  ]),
  async (req, res) => {
    try {
      const { id } =
        req.params;
      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid bike id",
        });
      }
      const bike =
        await Bike.findById(id);
      if (!bike) {
        return res.status(404).json({
          success: false,
          message:
            "Bike not found",
        });
      }
      const isAdminUser =
        req.user.role === "admin";
      const isOwner =
        bike.createdBy &&
        bike.createdBy.toString() ===
          req.user.id.toString();
      const isSeller =
        bike.sellerUser &&
        bike.sellerUser.toString() ===
          req.user.id.toString();
      if (
        !isAdminUser &&
        !isOwner &&
        !isSeller
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to update this bike",
        });
      }
      const {
        brand,
        model,
        variant,
      } = req.body;
      const nextBrand =
        brand || bike.brand;
      const nextModel =
        model === undefined
          ? bike.model
          : model || null;
      const nextVariant =
        model !== undefined &&
        !model
          ? null
          : variant === undefined
            ? bike.variant
            : variant || null;
      await validateBikeHierarchy(
        nextBrand,
        nextModel,
        nextVariant
      );
      const updateData = {
        ...req.body,
        brand: nextBrand,
        model: nextModel,
        variant: nextVariant,
      };
      if (
        updateData.seller !==
        undefined
      ) {
        updateData.seller =
          updateData.seller &&
          String(
            updateData.seller
          ).trim()
            ? encryptSeller(
                String(
                  updateData.seller
                ).trim()
              )
            : null;
      }
      if (
        req.body.price === ""
      ) {
        updateData.price =
          null;
      }
      if (
        req.body.km === ""
      ) {
        updateData.km =
          null;
      }
      if (
        req.body.insurance === ""
      ) {
        updateData.insurance =
          null;
      }
      if (
        req.body.city === ""
      ) {
        updateData.city =
          null;
      }
      if (
        req.body.description === ""
      ) {
        updateData.description =
          null;
      }
      const registration =
        validateRegistration(
          req.body.registrationState !==
            undefined
            ? req.body
                .registrationState
            : bike.registrationState,
          req.body.registrationNumber !==
            undefined
            ? req.body
                .registrationNumber
            : bike.registrationNumber
        );
      updateData.registrationState =
        registration.registrationState;
      updateData.registrationNumber =
        registration.registrationNumber;
      /* ======================================================
         BANNER
      ====================================================== */
      if (
        req.files?.banner?.length
      ) {
        if (bike.bannerImage) {
          await safeDeleteMedia(
            bike.bannerImage
          );
        }
        updateData.bannerImage =
          await uploadBikeImage(
            req.files.banner[0],
            "bikes/banner"
          );
      }
      /* ======================================================
         GALLERY
      ====================================================== */
      let existingGallery = [];
      if (
        req.body.existingGallery
      ) {
        try {
          existingGallery =
            JSON.parse(
              req.body.existingGallery
            );
          if (
            !Array.isArray(
              existingGallery
            )
          ) {
            existingGallery = [];
          }
        } catch (_) {
          existingGallery = [];
        }
      } else {
        existingGallery =
          Array.isArray(
            bike.galleryImages
          )
            ? bike.galleryImages.filter(
                (item) =>
                  typeof item ===
                    "string" &&
                  item.trim()
              )
            : [];
      }
      if (
        req.files?.gallery?.length
      ) {
        const newGallery =
          await Promise.all(
            req.files.gallery.map(
              (file) =>
                uploadBikeImage(
                  file,
                  "bikes/gallery"
                )
            )
          );
        const oldGallery =
          Array.isArray(
            bike.galleryImages
          )
            ? bike.galleryImages
            : [];
        for (
          const oldImage of
          oldGallery
        ) {
          if (
            typeof oldImage ===
              "string" &&
            oldImage.trim() &&
            !existingGallery.includes(
              oldImage
            )
          ) {
            await safeDeleteMedia(
              oldImage
            );
          }
        }
        updateData.galleryImages = [
          ...existingGallery,
          ...newGallery,
        ];
      } else {
        const oldGallery =
          Array.isArray(
            bike.galleryImages
          )
            ? bike.galleryImages
            : [];
        for (
          const oldImage of
          oldGallery
        ) {
          if (
            typeof oldImage ===
              "string" &&
            oldImage.trim() &&
            !existingGallery.includes(
              oldImage
            )
          ) {
            await safeDeleteMedia(
              oldImage
            );
          }
        }
        updateData.galleryImages =
          existingGallery;
      }
      /* ======================================================
         AUDIO
      ====================================================== */
      if (
        req.files?.audio?.length
      ) {
        if (bike.audioNote) {
          await safeDeleteMedia(
            bike.audioNote
          );
        }
        updateData.audioNote =
          await uploadBikeImage(
            req.files.audio[0],
            "bikes/audio"
          );
      }
      /* ======================================================
         VIDEOS
      ====================================================== */
      const videoFiles = [
        ...(req.files?.video || []),
        ...(req.files?.videos || []),
      ];
      let existingVideos = [];
      if (
        req.body.existingVideos
      ) {
        try {
          existingVideos =
            JSON.parse(
              req.body.existingVideos
            );
          if (
            !Array.isArray(
              existingVideos
            )
          ) {
            existingVideos = [];
          }
        } catch (_) {
          existingVideos = [];
        }
      } else {
        existingVideos =
          Array.isArray(
            bike.videos
          )
            ? bike.videos.filter(
                (item) =>
                  typeof item ===
                    "string" &&
                  item.trim()
              )
            : [];
      }
      if (videoFiles.length) {
        const newVideos =
          await Promise.all(
            videoFiles.map(
              (file) =>
                uploadBikeImage(
                  file,
                  "bikes/videos"
                )
            )
          );
        const oldVideos =
          Array.isArray(
            bike.videos
          )
            ? bike.videos
            : [];
        for (
          const oldVideo of
          oldVideos
        ) {
          if (
            typeof oldVideo ===
              "string" &&
            oldVideo.trim() &&
            !existingVideos.includes(
              oldVideo
            )
          ) {
            await safeDeleteMedia(
              oldVideo
            );
          }
        }
        updateData.videos = [
          ...existingVideos,
          ...newVideos,
        ];
      } else {
        const oldVideos =
          Array.isArray(
            bike.videos
          )
            ? bike.videos
            : [];
        for (
          const oldVideo of
          oldVideos
        ) {
          if (
            typeof oldVideo ===
              "string" &&
            oldVideo.trim() &&
            !existingVideos.includes(
              oldVideo
            )
          ) {
            await safeDeleteMedia(
              oldVideo
            );
          }
        }
        updateData.videos =
          existingVideos;
      }
      /* ======================================================
         UPDATE DATABASE
      ====================================================== */
      const updatedBike =
        await Bike.findByIdAndUpdate(
          id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        )
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id brand title imageUrl"
          )
          .populate(
            "variant",
            "_id model title imageUrl"
          )
          .lean();
      prepareSellerForResponse(
        updatedBike,
        isAdminUser,
        isOwner || isSeller
      );
      return res.json({
        success: true,
        message:
          "Bike updated successfully",
        bike: updatedBike,
      });
    } catch (error) {
      console.error(
        "UPDATE BIKE ERROR:",
        error
      );
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to update bike",
      });
    }
  }
);
/* ============================================================
   REQUEST DELETE
   PUT /api/bikes/:id/request-delete
============================================================ */
router.put(
  "/:id/request-delete",
  verifyToken,
  async (req, res) => {
    try {
      const { id } =
        req.params;
      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid bike id",
        });
      }
      const bike =
        await Bike.findById(id);
      if (!bike) {
        return res.status(404).json({
          success: false,
          message:
            "Bike not found",
        });
      }
      const isOwner =
        bike.createdBy &&
        bike.createdBy.toString() ===
          req.user.id.toString();
      const isSeller =
        bike.sellerUser &&
        bike.sellerUser.toString() ===
          req.user.id.toString();
      if (
        !isOwner &&
        !isSeller
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to delete this bike",
        });
      }
      bike.status =
        "delete_requested";
      await bike.save();
      return res.json({
        success: true,
        message:
          "Bike delete request submitted",
        bikeId: bike._id,
        status: bike.status,
      });
    } catch (error) {
      console.error(
        "REQUEST DELETE BIKE ERROR:",
        error
      );
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to request bike deletion",
      });
    }
  }
);
export default router;