// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import express from "express";
import mongoose from "mongoose";
import Bike from "../../models/bike/bike_model.js";
import BikeBrand from "../../models/bike/brand/bike_brand_model.js";
import BikeModel from "../../models/bike/model/bike_model_model.js";
import BikeVariant from "../../models/bike/variant/bike_variant_model.js";
import { verifyToken, isAdmin } from "../../middleware/auth.js";
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
   SELLER RESPONSE
============================================================ */
const prepareSellerForResponse = (
  bike
) => {
  if (!bike) return bike;
  if (
    typeof bike.seller === "string" &&
    bike.seller.includes(":")
  ) {
    try {
      bike.seller =
        decryptSeller(bike.seller);
    } catch (_) {}
  }
  return bike;
};
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
  if (
    modelDoc.brand &&
    modelDoc.brand.toString() !==
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
    if (
      variantDoc.model &&
      variantDoc.model.toString() !==
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
   UPLOAD FIELDS
============================================================ */
const uploadFields = [
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
];
/* ============================================================
   MASTER DATA - BRANDS
============================================================ */
router.get(
  "/brands",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const brands =
        await BikeBrand.find({})
          .select(
            "_id name logoUrl"
          )
          .sort({
            name: 1,
          })
          .lean();
      return res.json({
        success: true,
        count: brands.length,
        brands,
      });
    } catch (error) {
      console.error(
        "ADMIN GET BIKE BRANDS ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get bike brands",
      });
    }
  }
);
/* ============================================================
   MASTER DATA - ALL MODELS
============================================================ */
router.get(
  "/bikemodels",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const models =
        await BikeModel.find({})
          .select(
            "_id brand title imageUrl"
          )
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .sort({
            title: 1,
          })
          .lean();
      return res.json({
        success: true,
        count: models.length,
        models,
      });
    } catch (error) {
      console.error(
        "ADMIN GET BIKE MODELS ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get bike models",
      });
    }
  }
);
/* ============================================================
   MODELS BY BRAND
============================================================ */
router.get(
  "/bikemodels/brand/:brandId",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const {
        brandId,
      } = req.params;
      if (
        !mongoose.Types.ObjectId.isValid(
          brandId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid brand id",
        });
      }
      const models =
        await BikeModel.find({
          brand: brandId,
        })
          .select(
            "_id brand title imageUrl"
          )
          .sort({
            title: 1,
          })
          .lean();
      return res.json({
        success: true,
        count: models.length,
        models,
      });
    } catch (error) {
      console.error(
        "ADMIN GET BIKE MODELS BY BRAND ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get bike models by brand",
      });
    }
  }
);
/* ============================================================
   ALL VARIANTS
============================================================ */
router.get(
  "/bikevariants",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const variants =
        await BikeVariant.find({})
          .select(
            "_id model title imageUrl"
          )
          .populate(
            "model",
            "_id title imageUrl brand"
          )
          .sort({
            title: 1,
          })
          .lean();
      return res.json({
        success: true,
        count: variants.length,
        variants,
      });
    } catch (error) {
      console.error(
        "ADMIN GET BIKE VARIANTS ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get bike variants",
      });
    }
  }
);
/* ============================================================
   VARIANTS BY MODEL
============================================================ */
router.get(
  "/bikevariants/model/:modelId",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const {
        modelId,
      } = req.params;
      if (
        !mongoose.Types.ObjectId.isValid(
          modelId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid model id",
        });
      }
      const variants =
        await BikeVariant.find({
          model: modelId,
        })
          .select(
            "_id model title imageUrl"
          )
          .sort({
            title: 1,
          })
          .lean();
      return res.json({
        success: true,
        count: variants.length,
        variants,
      });
    } catch (error) {
      console.error(
        "ADMIN GET BIKE VARIANTS BY MODEL ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get bike variants by model",
      });
    }
  }
);
/* ============================================================
   ADMIN ADD BIKE
   POST /api/bikes/admin/add
============================================================ */
router.post(
  "/add",
  verifyToken,
  isAdmin,
  uploadBike.fields(
    uploadFields
  ),
  async (req, res) => {
    try {
      const {
        brand,
        model,
        variant,
        registrationState,
        registrationNumber,
        year,
        price,
        km,
        seller,
        sellerUser,
        sellerinfo,
        district,
        city,
        description,
        insurance,
        status,
        videoLink,
      } = req.body;
      if (
        !req.files?.banner?.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Banner image required",
        });
      }
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
      const {
        bannerImage,
        galleryImages,
        audioNote,
        videos,
      } =
        await uploadBikeMedia(
          req.files
        );
      const finalSeller =
        seller &&
        typeof seller === "string" &&
        seller.trim()
          ? encryptSeller(
              seller.trim()
            )
          : null;
      const bike =
        await Bike.create({
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
          seller:
            finalSeller,
          sellerUser:
            sellerUser || null,
          sellerinfo:
            sellerinfo ||
            "Rc owner",
          district,
          city:
            city || null,
          description:
            description || null,
          insurance:
            insurance || null,
          status:
            status || "available",
          bannerImage,
          galleryImages,
          audioNote,
          videos,
          videoLink:
            videoLink || null,
          createdBy:
            req.user.id,
        });
      const responseBike =
        prepareSellerForResponse(
          bike.toObject()
        );
      return res.status(201).json({
        success: true,
        message:
          "Bike added successfully",
        bike: responseBike,
      });
    } catch (error) {
      console.error(
        "ADMIN ADD BIKE ERROR:",
        error
      );
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to add bike",
      });
    }
  }
);
/* ============================================================
   ADMIN GET ALL BIKES
   GET /api/bikes/admin/all
============================================================ */
router.get(
  "/all",
  verifyToken,
  isAdmin,
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
      }
      if (district) {
        filter.district =
          district;
      }
      if (city) {
        filter.city = city;
      }
      if (insurance) {
        filter.insurance =
          insurance;
      }
      if (registrationState) {
        filter.registrationState =
          String(
            registrationState
          )
            .trim()
            .toUpperCase();
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
          .populate(
            "createdBy",
            "-password"
          )
          .populate(
            "sellerUser",
            "-password"
          )
          .sort({
            createdAt: -1,
          })
          .lean();
      const result =
        bikes.map(
          (bike) =>
            prepareSellerForResponse(
              bike
            )
        );
      return res.json({
        success: true,
        count: result.length,
        bikes: result,
      });
    } catch (error) {
      console.error(
        "ADMIN GET ALL BIKES ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get all bikes",
      });
    }
  }
);
/* ============================================================
   ADMIN GET ONE
   GET /api/bikes/admin/:id
============================================================ */
router.get(
  "/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;
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
          .populate(
            "createdBy",
            "-password"
          )
          .populate(
            "sellerUser",
            "-password"
          )
          .lean();
      if (!bike) {
        return res.status(404).json({
          success: false,
          message:
            "Bike not found",
        });
      }
      return res.json({
        success: true,
        bike:
          prepareSellerForResponse(
            bike
          ),
      });
    } catch (error) {
      console.error(
        "ADMIN GET BIKE ERROR:",
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
   ADMIN STATUS
   PATCH /api/bikes/admin/:id/status
============================================================ */
router.patch(
  "/:id/status",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;
      const {
        status,
      } = req.body;
      const allowedStatuses = [
        "available",
        "booking",
        "sold",
        "draft",
        "delete_requested",
      ];
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
      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid bike status",
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
      bike.status = status;
      await bike.save();
      const responseBike =
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
      return res.json({
        success: true,
        message:
          "Bike status updated successfully",
        bike:
          prepareSellerForResponse(
            responseBike
          ),
      });
    } catch (error) {
      console.error(
        "ADMIN BIKE STATUS ERROR:",
        error
      );
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to update bike status",
      });
    }
  }
);
/* ============================================================
   ADMIN UPDATE BIKE
   PUT /api/bikes/admin/:id
============================================================ */
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadBike.fields(
    uploadFields
  ),
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;
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
      const finalBrand =
        req.body.brand !==
        undefined
          ? req.body.brand
          : bike.brand;
      const finalModel =
        req.body.model !==
        undefined
          ? req.body.model ||
            null
          : bike.model;
      const finalVariant =
        req.body.variant !==
        undefined
          ? req.body.variant ||
            null
          : bike.variant;
      await validateBikeHierarchy(
        finalBrand,
        finalModel,
        finalVariant
      );
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
      const allowedFields = [
        "year",
        "price",
        "km",
        "sellerUser",
        "sellerinfo",
        "district",
        "city",
        "description",
        "insurance",
        "status",
        "videoLink",
      ];
      for (
        const field of
        allowedFields
      ) {
        if (
          req.body[field] !==
          undefined
        ) {
          bike[field] =
            req.body[field];
        }
      }
      bike.brand =
        finalBrand;
      bike.model =
        finalModel;
      bike.variant =
        finalVariant;
      bike.registrationState =
        registration.registrationState;
      bike.registrationNumber =
        registration.registrationNumber;
      if (
        req.body.seller !==
        undefined
      ) {
        bike.seller =
          req.body.seller &&
          String(
            req.body.seller
          ).trim()
            ? encryptSeller(
                String(
                  req.body.seller
                ).trim()
              )
            : null;
      }
      if (
        req.body.price === ""
      ) {
        bike.price = null;
      }
      if (
        req.body.km === ""
      ) {
        bike.km = null;
      }
      if (
        req.body.insurance === ""
      ) {
        bike.insurance = null;
      }
      if (
        req.body.city === ""
      ) {
        bike.city = null;
      }
      if (
        req.body.description === ""
      ) {
        bike.description =
          null;
      }
      if (
        req.body.videoLink === ""
      ) {
        bike.videoLink = null;
      }
      /* ======================================================
         BANNER
      ====================================================== */
      if (
        req.files?.banner?.length
      ) {
        await safeDeleteMedia(
          bike.bannerImage
        );
        bike.bannerImage =
          await uploadBikeImage(
            req.files.banner[0],
            "bikes/banner"
          );
      }
      /* ======================================================
         GALLERY
      ====================================================== */
      if (
        req.files?.gallery?.length
      ) {
        if (
          Array.isArray(
            bike.galleryImages
          )
        ) {
          for (
            const oldImage of
            bike.galleryImages
          ) {
            await safeDeleteMedia(
              oldImage
            );
          }
        }
        bike.galleryImages =
          await Promise.all(
            req.files.gallery.map(
              (image) =>
                uploadBikeImage(
                  image,
                  "bikes/gallery"
                )
            )
          );
      }
      /* ======================================================
         AUDIO
      ====================================================== */
      if (
        req.files?.audio?.length
      ) {
        await safeDeleteMedia(
          bike.audioNote
        );
        bike.audioNote =
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
      if (videoFiles.length) {
        if (
          Array.isArray(
            bike.videos
          )
        ) {
          for (
            const oldVideo of
            bike.videos
          ) {
            await safeDeleteMedia(
              oldVideo
            );
          }
        }
        bike.videos =
          await Promise.all(
            videoFiles.map(
              (video) =>
                uploadBikeImage(
                  video,
                  "bikes/videos"
                )
            )
          );
      }
      await bike.save();
      return res.json({
        success: true,
        message:
          "Bike updated successfully",
        bike:
          prepareSellerForResponse(
            bike.toObject()
          ),
      });
    } catch (error) {
      console.error(
        "ADMIN UPDATE BIKE ERROR:",
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
   ADMIN DELETE BIKE
   DELETE /api/bikes/admin/:id
============================================================ */
router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;
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
      await safeDeleteMedia(
        bike.bannerImage
      );
      if (
        Array.isArray(
          bike.galleryImages
        )
      ) {
        for (
          const image of
          bike.galleryImages
        ) {
          await safeDeleteMedia(
            image
          );
        }
      }
      await safeDeleteMedia(
        bike.audioNote
      );
      if (
        Array.isArray(
          bike.videos
        )
      ) {
        for (
          const video of
          bike.videos
        ) {
          await safeDeleteMedia(
            video
          );
        }
      }
      await bike.deleteOne();
      return res.json({
        success: true,
        message:
          "Bike deleted successfully",
      });
    } catch (error) {
      console.error(
        "ADMIN DELETE BIKE ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Delete failed",
      });
    }
  }
);
/* ============================================================
   ADMIN APPROVE
   PATCH /api/bikes/admin/:id/approve
============================================================ */
router.patch(
  "/:id/approve",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;
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
      bike.status =
        "available";
      await bike.save();
      const responseBike =
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
      return res.json({
        success: true,
        message:
          "Bike approved successfully",
        bike:
          prepareSellerForResponse(
            responseBike
          ),
      });
    } catch (error) {
      console.error(
        "ADMIN APPROVE BIKE ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to approve bike",
      });
    }
  }
);
/* ============================================================
   ADMIN REJECT
   PATCH /api/bikes/admin/:id/reject
============================================================ */
router.patch(
  "/:id/reject",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;
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
      bike.status = "draft";
      await bike.save();
      const responseBike =
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
      return res.json({
        success: true,
        message:
          "Bike moved to draft successfully",
        bike:
          prepareSellerForResponse(
            responseBike
          ),
      });
    } catch (error) {
      console.error(
        "ADMIN REJECT BIKE ERROR:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to reject bike",
      });
    }
  }
);
export default router;