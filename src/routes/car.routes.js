import express from "express";
import mongoose from "mongoose";

import Car from "../models/car_model.js";
import User from "../models/user_model.js";

import {
  verifyToken,
  isAdmin,
} from "../middleware/auth.js";

import { verifyTokenOptional } from "../middleware/verifyTokenOptional.js";

import uploadCar from "../middleware/uploadCar.js";

import {
  uploadCarImage,
  deleteCarImage,
} from "../utils/carUpload.js";

import { decryptSeller } from "../utils/sellerCrypto.js";

const router = express.Router();

/* ============================================================
   REGISTRATION STATES
   TN = DEFAULT + FIRST
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

const validateRegistration = (state, number) => {
  const registrationState = String(state || "TN")
    .trim()
    .toUpperCase();

  const registrationNumber = String(number || "").trim();

  if (!REGISTRATION_STATES.includes(registrationState)) {
    throw new Error("Invalid registration state");
  }

  if (!/^[0-9]{2}$/.test(registrationNumber)) {
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
   ADD CAR - ADMIN
   POST /api/cars/add
============================================================ */

router.post(
  "/add",
  verifyToken,
  isAdmin,
  uploadCar.fields([
    {
      name: "banner",
      maxCount: 1,
    },
    {
      name: "gallery",
      maxCount: 10,
    },
    {
      name: "audio",
      maxCount: 1,
    },
    {
      name: "video",
      maxCount: 5,
    },
  ]),
  async (req, res) => {
    try {
      const {
        brand,
        variant,
        videoLink,
        registrationState,
        registrationNumber,
      } = req.body;

      /* --------------------------------------------------------
         REGISTRATION
      -------------------------------------------------------- */

      const registration = validateRegistration(
        registrationState,
        registrationNumber
      );

      /* --------------------------------------------------------
         BANNER REQUIRED
      -------------------------------------------------------- */

      if (!req.files?.banner?.length) {
        return res.status(400).json({
          success: false,
          message: "Banner image required",
        });
      }

      /* --------------------------------------------------------
         BRAND VALIDATION
      -------------------------------------------------------- */

      if (!mongoose.Types.ObjectId.isValid(brand)) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand id",
        });
      }

      /* --------------------------------------------------------
         VARIANT VALIDATION
      -------------------------------------------------------- */

      if (
        variant &&
        !mongoose.Types.ObjectId.isValid(variant)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid variant id",
        });
      }

      /* --------------------------------------------------------
         UPLOAD BANNER
      -------------------------------------------------------- */

      const bannerImage = await uploadCarImage(
        req.files.banner[0],
        "cars/banner"
      );

      /* --------------------------------------------------------
         UPLOAD GALLERY
      -------------------------------------------------------- */

      const galleryImages = req.files?.gallery
        ? await Promise.all(
            req.files.gallery.map((img) =>
              uploadCarImage(
                img,
                "cars/gallery"
              )
            )
          )
        : [];

      /* --------------------------------------------------------
         UPLOAD AUDIO
      -------------------------------------------------------- */

      let audioNote = null;

      if (req.files?.audio?.length) {
        audioNote = await uploadCarImage(
          req.files.audio[0],
          "cars/audio"
        );
      }

      /* --------------------------------------------------------
         UPLOAD VIDEOS
      -------------------------------------------------------- */

      const videos = req.files?.video
        ? await Promise.all(
            req.files.video.map((vid) =>
              uploadCarImage(
                vid,
                "cars/videos"
              )
            )
          )
        : [];

      /* --------------------------------------------------------
         CREATE CAR
      -------------------------------------------------------- */

      const car = await Car.create({
        ...req.body,

        registrationState:
          registration.registrationState,

        registrationNumber:
          registration.registrationNumber,

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
        message: "Car added successfully",
        car,
      });
    } catch (err) {
      console.error(
        "ADD CAR ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/* ============================================================
   GET ALL CARS
   GET /api/cars
============================================================ */

router.get(
  "/",
  verifyTokenOptional,
  async (req, res) => {
    try {
      const isAdminUser =
        req.user?.role === "admin";

      const query = {};

      const {
        brand,
        variant,
        fuel,
        transmission,
        owner,
        board,
        district,
        minPrice,
        maxPrice,
        minYear,
        maxYear,
      } = req.query;

      /* --------------------------------------------------------
         BRAND FILTER
      -------------------------------------------------------- */

      if (brand) {
        const ids = brand
          .split(",")
          .map((id) => id.trim())
          .filter((id) =>
            mongoose.Types.ObjectId.isValid(id)
          );

        if (ids.length) {
          query.brand = {
            $in: ids.map(
              (id) =>
                new mongoose.Types.ObjectId(id)
            ),
          };
        }
      }

      /* --------------------------------------------------------
         VARIANT FILTER
      -------------------------------------------------------- */

      if (variant) {
        const ids = variant
          .split(",")
          .map((id) => id.trim())
          .filter((id) =>
            mongoose.Types.ObjectId.isValid(id)
          );

        if (ids.length) {
          query.variant = {
            $in: ids.map(
              (id) =>
                new mongoose.Types.ObjectId(id)
            ),
          };
        }
      }

      /* --------------------------------------------------------
         DISTRICT FILTER
      -------------------------------------------------------- */

      if (district) {
        query.district = {
          $in: district
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
        };
      }

      /* --------------------------------------------------------
         FUEL FILTER
      -------------------------------------------------------- */

      if (fuel) {
        query.fuel = {
          $in: fuel
            .split(",")
            .map((f) =>
              f.trim().toLowerCase()
            )
            .filter(Boolean),
        };
      }

      /* --------------------------------------------------------
         OWNER FILTER
      -------------------------------------------------------- */

      if (owner) {
        query.owner = {
          $in: owner
            .split(",")
            .map((o) => Number(o))
            .filter((o) => !Number.isNaN(o)),
        };
      }

      /* --------------------------------------------------------
         TRANSMISSION
      -------------------------------------------------------- */

      if (transmission) {
        query.transmission =
          transmission;
      }

      /* --------------------------------------------------------
         BOARD
      -------------------------------------------------------- */

      if (board) {
        query.board = board;
      }

      /* --------------------------------------------------------
         PRICE
      -------------------------------------------------------- */

      if (minPrice || maxPrice) {
        query.price = {};

        if (minPrice) {
          query.price.$gte =
            Number(minPrice);
        }

        if (maxPrice) {
          query.price.$lte =
            Number(maxPrice);
        }
      }

      /* --------------------------------------------------------
         YEAR
      -------------------------------------------------------- */

      if (minYear || maxYear) {
        query.year = {};

        if (minYear) {
          query.year.$gte =
            Number(minYear);
        }

        if (maxYear) {
          query.year.$lte =
            Number(maxYear);
        }
      }

      /* --------------------------------------------------------
         HIDE DRAFT / DELETE REQUEST
         FROM NORMAL USERS
      -------------------------------------------------------- */

      if (!isAdminUser) {
        query.status = {
          $nin: [
            "draft",
            "delete_requested",
          ],
        };
      }

      /* --------------------------------------------------------
         FETCH
      -------------------------------------------------------- */

      const cars = await Car.find(query)
        .populate(
          "brand",
          "name logoUrl"
        )
        .populate(
          "variant",
          "title imageUrl"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      /* --------------------------------------------------------
         DECRYPT SELLER FOR ADMIN
      -------------------------------------------------------- */

      const finalCars = cars.map(
        (car) => {
          if (
            isAdminUser &&
            typeof car.seller ===
              "string" &&
            car.seller.includes(":")
          ) {
            try {
              car.seller =
                decryptSeller(
                  car.seller
                );
            } catch (_) {
              // Keep encrypted value
            }
          }

          return car;
        }
      );

      return res.json({
        success: true,
        count: finalCars.length,
        cars: finalCars,
      });
    } catch (err) {
      console.error(
        "GET CARS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch cars",
      });
    }
  }
);

/* ============================================================
   UPDATE CAR
   PUT /api/cars/:id
============================================================ */

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadCar.fields([
    {
      name: "banner",
      maxCount: 1,
    },
    {
      name: "gallery",
      maxCount: 10,
    },
    {
      name: "audio",
      maxCount: 1,
    },
    {
      name: "video",
      maxCount: 5,
    },
  ]),
  async (req, res) => {
    try {
      /* --------------------------------------------------------
         FIND CAR
      -------------------------------------------------------- */

      const car = await Car.findById(
        req.params.id
      );

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      /* --------------------------------------------------------
         BANNER
      -------------------------------------------------------- */

      if (req.files?.banner?.length) {
        if (car.bannerImage) {
          await deleteCarImage(
            car.bannerImage
          );
        }

        car.bannerImage =
          await uploadCarImage(
            req.files.banner[0],
            "cars/banner"
          );
      }

      /* --------------------------------------------------------
         GALLERY
      -------------------------------------------------------- */

      if (req.files?.gallery?.length) {
        if (
          Array.isArray(
            car.galleryImages
          )
        ) {
          for (
            const img of car.galleryImages
          ) {
            try {
              await deleteCarImage(img);
            } catch (_) {}
          }
        }

        car.galleryImages =
          await Promise.all(
            req.files.gallery.map(
              (img) =>
                uploadCarImage(
                  img,
                  "cars/gallery"
                )
            )
          );
      }

      /* --------------------------------------------------------
         AUDIO
      -------------------------------------------------------- */

      if (req.files?.audio?.length) {
        if (car.audioNote) {
          try {
            await deleteCarImage(
              car.audioNote
            );
          } catch (_) {}
        }

        car.audioNote =
          await uploadCarImage(
            req.files.audio[0],
            "cars/audio"
          );
      }

      /* --------------------------------------------------------
         VIDEOS
      -------------------------------------------------------- */

      if (req.files?.video?.length) {
        if (
          Array.isArray(car.videos)
        ) {
          for (
            const video of car.videos
          ) {
            try {
              await deleteCarImage(video);
            } catch (_) {}
          }
        }

        car.videos =
          await Promise.all(
            req.files.video.map(
              (video) =>
                uploadCarImage(
                  video,
                  "cars/videos"
                )
            )
          );
      }

      /* --------------------------------------------------------
         VIDEO LINK
      -------------------------------------------------------- */

      if (
        req.body.videoLink !==
        undefined
      ) {
        car.videoLink =
          req.body.videoLink ||
          null;
      }

      /* --------------------------------------------------------
         REGISTRATION
      -------------------------------------------------------- */

      const hasRegistrationState =
        req.body.registrationState !==
        undefined;

      const hasRegistrationNumber =
        req.body.registrationNumber !==
        undefined;

      if (
        hasRegistrationState ||
        hasRegistrationNumber
      ) {
        const registration =
          validateRegistration(
            hasRegistrationState
              ? req.body.registrationState
              : car.registrationState,
            hasRegistrationNumber
              ? req.body.registrationNumber
              : car.registrationNumber
          );

        car.registrationState =
          registration.registrationState;

        car.registrationNumber =
          registration.registrationNumber;
      }

      /* --------------------------------------------------------
         SAFE FIELD UPDATE
      -------------------------------------------------------- */

      const allowedFields = [
        "brand",
        "variant",
        "model",
        "year",
        "price",
        "km",
        "color",
        "fuel",
        "transmission",
        "owner",
        "board",
        "insurance",
        "status",
        "sellerinfo",
        "district",
        "city",
        "description",
      ];

      allowedFields.forEach(
        (field) => {
          if (
            req.body[field] !==
            undefined
          ) {
            car[field] =
              req.body[field];
          }
        }
      );

      await car.save();

      return res.json({
        success: true,
        message:
          "Car updated successfully",
        car,
      });
    } catch (err) {
      console.error(
        "UPDATE CAR ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/* ============================================================
   DELETE CAR
   DELETE /api/cars/:id
============================================================ */

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const car = await Car.findById(
        req.params.id
      );

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      /* --------------------------------------------------------
         BANNER
      -------------------------------------------------------- */

      if (car.bannerImage) {
        try {
          await deleteCarImage(
            car.bannerImage
          );
        } catch (_) {}
      }

      /* --------------------------------------------------------
         GALLERY
      -------------------------------------------------------- */

      if (
        Array.isArray(
          car.galleryImages
        )
      ) {
        for (
          const img of car.galleryImages
        ) {
          try {
            await deleteCarImage(img);
          } catch (_) {}
        }
      }

      /* --------------------------------------------------------
         AUDIO
      -------------------------------------------------------- */

      if (car.audioNote) {
        try {
          await deleteCarImage(
            car.audioNote
          );
        } catch (_) {}
      }

      /* --------------------------------------------------------
         VIDEOS
      -------------------------------------------------------- */

      if (
        Array.isArray(car.videos)
      ) {
        for (
          const video of car.videos
        ) {
          try {
            await deleteCarImage(video);
          } catch (_) {}
        }
      }

      /* --------------------------------------------------------
         DELETE DATABASE DOCUMENT
      -------------------------------------------------------- */

      await car.deleteOne();

      return res.json({
        success: true,
        message: "Car deleted successfully",
      });
    } catch (err) {
      console.error(
        "DELETE CAR ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Delete failed",
      });
    }
  }
);

/* ============================================================
   USER ADD CAR
   POST /api/cars/user-add
============================================================ */

router.post(
  "/user-add",
  verifyToken,
  uploadCar.fields([
    {
      name: "gallery",
      maxCount: 10,
    },
    {
      name: "audio",
      maxCount: 1,
    },
    {
      name: "video",
      maxCount: 3,
    },
  ]),
  async (req, res) => {
    try {
      const {
        brand,
        variant,
        videoLink,
        registrationState,
        registrationNumber,
      } = req.body;

      /* --------------------------------------------------------
         REGISTRATION
      -------------------------------------------------------- */

      const registration =
        validateRegistration(
          registrationState,
          registrationNumber
        );

      /* --------------------------------------------------------
         BRAND
      -------------------------------------------------------- */

      if (
        !mongoose.Types.ObjectId.isValid(
          brand
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand id",
        });
      }

      /* --------------------------------------------------------
         VARIANT
      -------------------------------------------------------- */

      if (
        variant &&
        !mongoose.Types.ObjectId.isValid(
          variant
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid variant id",
        });
      }

      /* --------------------------------------------------------
         USER
      -------------------------------------------------------- */

      const user = await User.findById(
        req.user.id
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      /* --------------------------------------------------------
         GALLERY
      -------------------------------------------------------- */

      const galleryImages =
        req.files?.gallery
          ? await Promise.all(
              req.files.gallery.map(
                (img) =>
                  uploadCarImage(
                    img,
                    "cars/gallery"
                  )
              )
            )
          : [];

      /* --------------------------------------------------------
         AUDIO
      -------------------------------------------------------- */

      let audioNote = null;

      if (req.files?.audio?.length) {
        audioNote =
          await uploadCarImage(
            req.files.audio[0],
            "cars/audio"
          );
      }

      /* --------------------------------------------------------
         VIDEOS
      -------------------------------------------------------- */

      const videos =
        req.files?.video
          ? await Promise.all(
              req.files.video.map(
                (vid) =>
                  uploadCarImage(
                    vid,
                    "cars/videos"
                  )
              )
            )
          : [];

      /* --------------------------------------------------------
         CREATE USER CAR
      -------------------------------------------------------- */

      const car = await Car.create({
        ...req.body,

        registrationState:
          registration.registrationState,

        registrationNumber:
          registration.registrationNumber,

        bannerImage: null,

        galleryImages,

        audioNote,

        videos,

        videoLink:
          videoLink || null,

        seller: String(user.phone),

        sellerUser: user._id,

        createdBy: user._id,

        status: "draft",

        price: null,
      });

      return res.status(201).json({
        success: true,
        message:
          "Car submitted for admin approval",
        car,
      });
    } catch (err) {
      console.error(
        "USER ADD CAR ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/* ============================================================
   GET MY CARS
   GET /api/cars/my
============================================================ */

router.get(
  "/my",
  verifyToken,
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const cars =
        await Car.find({
          createdBy: userId,
        })
          .populate(
            "brand",
            "name logoUrl"
          )
          .populate(
            "variant",
            "title imageUrl"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      /* --------------------------------------------------------
         MASK SELLER
      -------------------------------------------------------- */

      const safeCars =
        cars.map((car) => {
          if (
            typeof car.seller ===
              "string" &&
            car.seller.includes(":")
          ) {
            car.seller =
              "**********";
          }

          return car;
        });

      return res.json({
        success: true,
        count: safeCars.length,
        cars: safeCars,
      });
    } catch (err) {
      console.error(
        "GET MY CARS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch user cars",
      });
    }
  }
);

/* ============================================================
   USER REQUEST DELETE
   PUT /api/cars/:id/request-delete
============================================================ */

router.put(
  "/:id/request-delete",
  verifyToken,
  async (req, res) => {
    try {
      const car = await Car.findById(
        req.params.id
      );

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      /* --------------------------------------------------------
         OWNER CHECK
      -------------------------------------------------------- */

      if (
        !car.createdBy ||
        car.createdBy.toString() !==
          req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized",
        });
      }

      car.status =
        "delete_requested";

      await car.save();

      return res.json({
        success: true,
        message:
          "Delete request sent",
      });
    } catch (err) {
      console.error(
        "REQUEST DELETE ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to request delete",
      });
    }
  }
);

/* ============================================================
   EXPORT
============================================================ */

export default router;