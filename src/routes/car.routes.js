import express from "express";
import mongoose from "mongoose";

import Car from "../models/car_model.js";
import User from "../models/user_model.js";
import CarBrand from "../models/car/brand/car_brand_model.js";
import CarVariant from "../models/car/variant/car_variant_model.js";

import {
  verifyToken,
  isAdmin,
} from "../middleware/auth.js";

import {
  verifyTokenOptional,
} from "../middleware/verifyTokenOptional.js";

import uploadCar from "../middleware/uploadCar.js";

import {
  uploadCarImage,
  deleteCarImage,
} from "../utils/carUpload.js";

import {
  decryptSeller,
} from "../utils/sellerCrypto.js";

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
    String(number || "")
      .trim();

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

      const registration =
        validateRegistration(
          registrationState,
          registrationNumber
        );

      if (
        !req.files?.banner?.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Banner image required",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          brand
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid brand id",
        });
      }

      if (
        variant &&
        !mongoose.Types.ObjectId.isValid(
          variant
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid variant id",
        });
      }

      const bannerImage =
        await uploadCarImage(
          req.files.banner[0],
          "cars/banner"
        );

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

      let audioNote = null;

      if (
        req.files?.audio?.length
      ) {
        audioNote =
          await uploadCarImage(
            req.files.audio[0],
            "cars/audio"
          );
      }

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

      const car =
        await Car.create({
          ...req.body,

          registrationState:
            registration.registrationState,

          registrationNumber:
            registration.registrationNumber,

          bannerImage,
          galleryImages,
          audioNote,
          videos,

          videoLink:
            videoLink || null,

          createdBy:
            req.user.id,

          status:
            "available",
        });

      return res.status(201).json({
        success: true,
        message:
          "Car added successfully",
        car,
      });
    } catch (err) {
      console.error(
        "ADD CAR ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message,
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
        const ids =
          String(brand)
            .split(",")
            .map(
              (id) =>
                id.trim()
            )
            .filter(
              (id) =>
                mongoose.Types.ObjectId.isValid(
                  id
                )
            );

        if (ids.length) {
          query.brand = {
            $in: ids.map(
              (id) =>
                new mongoose.Types.ObjectId(
                  id
                )
            ),
          };
        }
      }

      /* --------------------------------------------------------
         VARIANT FILTER
      -------------------------------------------------------- */

      if (variant) {
        const ids =
          String(variant)
            .split(",")
            .map(
              (id) =>
                id.trim()
            )
            .filter(
              (id) =>
                mongoose.Types.ObjectId.isValid(
                  id
                )
            );

        if (ids.length) {
          query.variant = {
            $in: ids.map(
              (id) =>
                new mongoose.Types.ObjectId(
                  id
                )
            ),
          };
        }
      }

      /* --------------------------------------------------------
         FUEL
      -------------------------------------------------------- */

      if (fuel) {
        query.fuel = fuel;
      }

      /* --------------------------------------------------------
         TRANSMISSION
      -------------------------------------------------------- */

      if (transmission) {
        query.transmission =
          transmission;
      }

      /* --------------------------------------------------------
         OWNER
      -------------------------------------------------------- */

      if (owner) {
        query.owner = owner;
      }

      /* --------------------------------------------------------
         BOARD
      -------------------------------------------------------- */

      if (board) {
        query.board = board;
      }

      /* --------------------------------------------------------
         DISTRICT
      -------------------------------------------------------- */

      if (district) {
        query.district =
          district;
      }

      /* --------------------------------------------------------
         PRICE
      -------------------------------------------------------- */

      if (
        minPrice ||
        maxPrice
      ) {
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

      if (
        minYear ||
        maxYear
      ) {
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
         NORMAL USERS
         HIDE DRAFT / DELETE REQUESTED
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
         FETCH RAW CARS
      -------------------------------------------------------- */

      const cars =
        await Car.find(query)
          .sort({
            createdAt: -1,
          })
          .lean();

      /* --------------------------------------------------------
         BRAND IDS
      -------------------------------------------------------- */

      const brandIds = [
        ...new Set(
          cars
            .map(
              (car) =>
                car.brand
            )
            .filter(
              (id) =>
                id &&
                mongoose.Types.ObjectId.isValid(
                  id
                )
            )
            .map(
              (id) =>
                id.toString()
            )
        ),
      ];

      /* --------------------------------------------------------
         VARIANT IDS
      -------------------------------------------------------- */

      const variantIds = [
        ...new Set(
          cars
            .map(
              (car) =>
                car.variant
            )
            .filter(
              (id) =>
                id &&
                mongoose.Types.ObjectId.isValid(
                  id
                )
            )
            .map(
              (id) =>
                id.toString()
            )
        ),
      ];

      /* --------------------------------------------------------
         MANUAL BRAND + VARIANT FETCH
         IMPORTANT:
         Avoid Mongoose populate ref/model mismatch.
      -------------------------------------------------------- */

      const [
        brands,
        variants,
      ] =
        await Promise.all([
          brandIds.length
            ? CarBrand.find({
                _id: {
                  $in: brandIds,
                },
              })
                .select(
                  "name logoUrl"
                )
                .lean()
            : [],

          variantIds.length
            ? CarVariant.find({
                _id: {
                  $in: variantIds,
                },
              })
                .select(
                  "title imageUrl"
                )
                .lean()
            : [],
        ]);

      /* --------------------------------------------------------
         MAP BRAND
      -------------------------------------------------------- */

      const brandMap =
        new Map(
          brands.map(
            (brand) => [
              brand._id.toString(),
              brand,
            ]
          )
        );

      /* --------------------------------------------------------
         MAP VARIANT
      -------------------------------------------------------- */

      const variantMap =
        new Map(
          variants.map(
            (variant) => [
              variant._id.toString(),
              variant,
            ]
          )
        );

      /* --------------------------------------------------------
         ATTACH BRAND + VARIANT
      -------------------------------------------------------- */

      const populatedCars =
        cars.map((car) => {
          const brandId =
            car.brand?.toString();

          const variantId =
            car.variant?.toString();

          return {
            ...car,

            brand:
              (
                brandId &&
                brandMap.get(
                  brandId
                )
              ) ||
              car.brand ||
              null,

            variant:
              (
                variantId &&
                variantMap.get(
                  variantId
                )
              ) ||
              car.variant ||
              null,
          };
        });

      /* --------------------------------------------------------
         DECRYPT SELLER FOR ADMIN
      -------------------------------------------------------- */

      const finalCars =
        populatedCars.map(
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
        count:
          finalCars.length,
        cars:
          finalCars,
      });
    } catch (err) {
      console.error(
        "GET CARS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to fetch cars",
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
      const car =
        await Car.findById(
          req.params.id
        );

      if (!car) {
        return res.status(404).json({
          success: false,
          message:
            "Car not found",
        });
      }

      /* --------------------------------------------------------
         BANNER
      -------------------------------------------------------- */

      if (
        req.files?.banner?.length
      ) {
        if (
          car.bannerImage
        ) {
          try {
            await deleteCarImage(
              car.bannerImage
            );
          } catch (_) {}
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

      if (
        req.files?.gallery?.length
      ) {
        const newGallery =
          await Promise.all(
            req.files.gallery.map(
              (img) =>
                uploadCarImage(
                  img,
                  "cars/gallery"
                )
            )
          );

        if (
          Array.isArray(
            car.galleryImages
          )
        ) {
          for (
            const img of
              car.galleryImages
          ) {
            try {
              await deleteCarImage(
                img
              );
            } catch (_) {}
          }
        }

        car.galleryImages =
          newGallery;
      }

      /* --------------------------------------------------------
         AUDIO
      -------------------------------------------------------- */

      if (
        req.files?.audio?.length
      ) {
        if (
          car.audioNote
        ) {
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

      if (
        req.files?.video?.length
      ) {
        const newVideos =
          await Promise.all(
            req.files.video.map(
              (video) =>
                uploadCarImage(
                  video,
                  "cars/videos"
                )
            )
          );

        if (
          Array.isArray(
            car.videos
          )
        ) {
          for (
            const video of
              car.videos
          ) {
            try {
              await deleteCarImage(
                video
              );
            } catch (_) {}
          }
        }

        car.videos =
          newVideos;
      }

      /* --------------------------------------------------------
         TEXT FIELDS
      -------------------------------------------------------- */

      const allowedFields = [
        "brand",
        "variant",
        "model",
        "registrationState",
        "registrationNumber",
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
        "videoLink",
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
        message:
          err.message,
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
      const car =
        await Car.findById(
          req.params.id
        );

      if (!car) {
        return res.status(404).json({
          success: false,
          message:
            "Car not found",
        });
      }

      /* --------------------------------------------------------
         BANNER
      -------------------------------------------------------- */

      if (
        car.bannerImage
      ) {
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
          const img of
            car.galleryImages
        ) {
          try {
            await deleteCarImage(
              img
            );
          } catch (_) {}
        }
      }

      /* --------------------------------------------------------
         AUDIO
      -------------------------------------------------------- */

      if (
        car.audioNote
      ) {
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
        Array.isArray(
          car.videos
        )
      ) {
        for (
          const video of
            car.videos
        ) {
          try {
            await deleteCarImage(
              video
            );
          } catch (_) {}
        }
      }

      await car.deleteOne();

      return res.json({
        success: true,
        message:
          "Car deleted successfully",
      });
    } catch (err) {
      console.error(
        "DELETE CAR ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Delete failed",
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

      const registration =
        validateRegistration(
          registrationState,
          registrationNumber
        );

      if (
        !mongoose.Types.ObjectId.isValid(
          brand
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid brand id",
        });
      }

      if (
        variant &&
        !mongoose.Types.ObjectId.isValid(
          variant
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid variant id",
        });
      }

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

      let audioNote = null;

      if (
        req.files?.audio?.length
      ) {
        audioNote =
          await uploadCarImage(
            req.files.audio[0],
            "cars/audio"
          );
      }

      const videos =
        req.files?.video
          ? await Promise.all(
              req.files.video.map(
                (video) =>
                  uploadCarImage(
                    video,
                    "cars/videos"
                  )
              )
            )
          : [];

      const car =
        await Car.create({
          ...req.body,

          registrationState:
            registration.registrationState,

          registrationNumber:
            registration.registrationNumber,

          galleryImages,
          audioNote,
          videos,

          videoLink:
            videoLink || null,

          createdBy:
            req.user.id,

          sellerUser:
            req.user.id,

          status:
            "pending",
        });

      return res.status(201).json({
        success: true,
        message:
          "Car submitted successfully",
        car,
      });
    } catch (err) {
      console.error(
        "USER ADD CAR ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message,
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
      const cars =
        await Car.find({
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
          .sort({
            createdAt: -1,
          })
          .populate(
            "brand",
            "name logoUrl"
          )
          .populate(
            "variant",
            "title imageUrl"
          )
          .lean();

      const finalCars =
        cars.map((car) => {
          if (
            typeof car.seller ===
              "string" &&
            car.seller.includes(":")
          ) {
            try {
              car.seller =
                decryptSeller(
                  car.seller
                );
            } catch (_) {}
          }

          return car;
        });

      return res.json({
        success: true,
        count:
          finalCars.length,
        cars:
          finalCars,
      });
    } catch (err) {
      console.error(
        "GET MY CARS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message,
      });
    }
  }
);

/* ============================================================
   GET CAR BY ID
   GET /api/cars/:id
============================================================ */

router.get(
  "/:id",
  verifyTokenOptional,
  async (req, res) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid car id",
        });
      }

      const car =
        await Car.findById(
          req.params.id
        ).lean();

      if (!car) {
        return res.status(404).json({
          success: false,
          message:
            "Car not found",
        });
      }

      /* --------------------------------------------------------
         BRAND
      -------------------------------------------------------- */

      if (
        car.brand &&
        mongoose.Types.ObjectId.isValid(
          car.brand
        )
      ) {
        const brand =
          await CarBrand.findById(
            car.brand
          )
            .select(
              "name logoUrl"
            )
            .lean();

        if (brand) {
          car.brand =
            brand;
        }
      }

      /* --------------------------------------------------------
         VARIANT
      -------------------------------------------------------- */

      if (
        car.variant &&
        mongoose.Types.ObjectId.isValid(
          car.variant
        )
      ) {
        const variant =
          await CarVariant.findById(
            car.variant
          )
            .select(
              "title imageUrl"
            )
            .lean();

        if (variant) {
          car.variant =
            variant;
        }
      }

      if (
        req.user?.role ===
          "admin" &&
        typeof car.seller ===
          "string" &&
        car.seller.includes(":")
      ) {
        try {
          car.seller =
            decryptSeller(
              car.seller
            );
        } catch (_) {}
      }

      return res.json({
        success: true,
        car,
      });
    } catch (err) {
      console.error(
        "GET CAR BY ID ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message,
      });
    }
  }
);

/* ============================================================
   ADMIN ALL CARS
   GET /api/cars/admin/all

   Compatibility endpoint for older Flutter CarApi.
============================================================ */

router.get(
  "/admin/all",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const cars =
        await Car.find({})
          .sort({
            createdAt: -1,
          })
          .lean();

      const brandIds = [
        ...new Set(
          cars
            .map(
              (car) =>
                car.brand
            )
            .filter(
              (id) =>
                id &&
                mongoose.Types.ObjectId.isValid(
                  id
                )
            )
            .map(
              (id) =>
                id.toString()
            )
        ),
      ];

      const variantIds = [
        ...new Set(
          cars
            .map(
              (car) =>
                car.variant
            )
            .filter(
              (id) =>
                id &&
                mongoose.Types.ObjectId.isValid(
                  id
                )
            )
            .map(
              (id) =>
                id.toString()
            )
        ),
      ];

      const [
        brands,
        variants,
      ] =
        await Promise.all([
          brandIds.length
            ? CarBrand.find({
                _id: {
                  $in: brandIds,
                },
              })
                .select(
                  "name logoUrl"
                )
                .lean()
            : [],

          variantIds.length
            ? CarVariant.find({
                _id: {
                  $in: variantIds,
                },
              })
                .select(
                  "title imageUrl"
                )
                .lean()
            : [],
        ]);

      const brandMap =
        new Map(
          brands.map(
            (brand) => [
              brand._id.toString(),
              brand,
            ]
          )
        );

      const variantMap =
        new Map(
          variants.map(
            (variant) => [
              variant._id.toString(),
              variant,
            ]
          )
        );

      const finalCars =
        cars.map((car) => {
          const brandId =
            car.brand?.toString();

          const variantId =
            car.variant?.toString();

          if (
            brandId &&
            brandMap.has(
              brandId
            )
          ) {
            car.brand =
              brandMap.get(
                brandId
              );
          }

          if (
            variantId &&
            variantMap.has(
              variantId
            )
          ) {
            car.variant =
              variantMap.get(
                variantId
              );
          }

          if (
            typeof car.seller ===
              "string" &&
            car.seller.includes(":")
          ) {
            try {
              car.seller =
                decryptSeller(
                  car.seller
                );
            } catch (_) {}
          }

          return car;
        });

      return res.status(200).json({
        success: true,
        count:
          finalCars.length,
        cars:
          finalCars,
      });
    } catch (err) {
      console.error(
        "ADMIN ALL CARS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to fetch admin cars",
      });
    }
  }
);

/* ============================================================
   EXPORT
============================================================ */

export default router;