import express from "express";
import mongoose from "mongoose";

import Car from "../../models/car/car_model.js";
import User from "../../models/user_model.js";

import CarBrand from "../../models/car/brand/car_brand_model.js";
import CarVariant from "../../models/car/variant/car_variant_model.js";
import CarModel from "../../models/car/model/car_model_model.js";

import {
  verifyToken,
  isAdmin,
} from "../../middleware/auth.js";

import {
  verifyTokenOptional,
} from "../../middleware/verifyTokenOptional.js";

import uploadCar from "../../middleware/car/uploadCar.js";

import {
  uploadCarImage,
  deleteCarImage,
} from "../../utils/car/carUpload.js";

import {
  encryptSeller,
  decryptSeller,
} from "../../utils/sellerCrypto.js";

const router = express.Router();

/* ============================================================
   SELLER RESPONSE
============================================================ */

const prepareSellerForResponse = (car, isAdminUser) => {
  if (!car) return car;

  if (!isAdminUser) {
    delete car.seller;
    return car;
  }

  if (
    typeof car.seller === "string" &&
    car.seller.includes(":")
  ) {
    try {
      car.seller = decryptSeller(car.seller);
    } catch (_) {}
  }

  return car;
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

const validateRegistration = (state, number) => {
  const registrationState =
    String(state || "TN")
      .trim()
      .toUpperCase();

  const registrationNumber =
    String(number || "").trim();

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
   BRAND / MODEL / VARIANT VALIDATION

   BRAND  = REQUIRED
   MODEL  = OPTIONAL
   VARIANT = OPTIONAL

   Variant can be selected only when Model is selected.
============================================================ */

const validateCarHierarchy = async (
  brand,
  model,
  variant = null
) => {
  /* ---------------- BRAND REQUIRED ---------------- */

  if (!mongoose.Types.ObjectId.isValid(brand)) {
    throw new Error("Invalid brand id");
  }

  const brandDoc = await CarBrand.findById(brand)
    .select("_id")
    .lean();

  if (!brandDoc) {
    throw new Error("Brand not found");
  }

  /* ---------------- MODEL OPTIONAL ---------------- */

  if (!model) {
    if (variant) {
      throw new Error(
        "Variant cannot be selected without a model"
      );
    }

    return;
  }

  if (!mongoose.Types.ObjectId.isValid(model)) {
    throw new Error("Invalid model id");
  }

  const modelDoc = await CarModel.findById(model)
    .select("_id brand brandId carBrand")
    .lean();

  if (!modelDoc) {
    throw new Error("Model not found");
  }

  const modelBrandId =
    modelDoc.brand ||
    modelDoc.brandId ||
    modelDoc.carBrand;

  if (
    modelBrandId &&
    modelBrandId.toString() !== brand.toString()
  ) {
    throw new Error(
      "Selected model does not belong to selected brand"
    );
  }

  /* ---------------- VARIANT OPTIONAL ---------------- */

  if (variant) {
    if (!mongoose.Types.ObjectId.isValid(variant)) {
      throw new Error("Invalid variant id");
    }

    const variantDoc =
      await CarVariant.findById(variant)
        .select(
          "_id carModel model modelId"
        )
        .lean();

    if (!variantDoc) {
      throw new Error("Variant not found");
    }

    const variantModelId =
      variantDoc.model ||
      variantDoc.modelId ||
      variantDoc.carModel;

    if (
      variantModelId &&
      variantModelId.toString() !== model.toString()
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

const uploadCarMedia = async (files) => {
  const bannerImage =
    files?.banner?.length
      ? await uploadCarImage(
          files.banner[0],
          "cars/banner"
        )
      : null;

  const galleryImages =
    files?.gallery?.length
      ? await Promise.all(
          files.gallery.map((file) =>
            uploadCarImage(
              file,
              "cars/gallery"
            )
          )
        )
      : [];

  const audioNote =
    files?.audio?.length
      ? await uploadCarImage(
          files.audio[0],
          "cars/audio"
        )
      : null;

  const videoFiles = [
    ...(files?.video || []),
    ...(files?.videos || []),
  ];

  const videos =
    videoFiles.length
      ? await Promise.all(
          videoFiles.map((file) =>
            uploadCarImage(
              file,
              "cars/videos"
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

const safeDeleteMedia = async (media) => {
  if (
    typeof media !== "string" ||
    !media.trim()
  ) {
    return;
  }

  try {
    await deleteCarImage(media);
  } catch (error) {
    console.error(
      "MEDIA DELETE ERROR:",
      error.message
    );
  }
};

/* ============================================================
   MASTER DATA - BRANDS
============================================================ */

router.get(
  "/brands",
  async (req, res) => {
    try {
      const brands =
        await CarBrand.find({})
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
        "GET BRANDS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get brands",
      });
    }
  }
);

/* ============================================================
   MASTER DATA - ALL MODELS
============================================================ */

router.get(
  "/carmodels",
  async (req, res) => {
    try {
      const models =
        await CarModel.find({})
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
        "GET MODELS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get models",
      });
    }
  }
);

/* ============================================================
   MODELS BY BRAND
============================================================ */

router.get(
  "/carmodels/brand/:brandId",
  async (req, res) => {
    try {
      const { brandId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          brandId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand id",
        });
      }

      const models =
        await CarModel.find({
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
        "GET MODELS BY BRAND ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get models by brand",
      });
    }
  }
);

/* ============================================================
   ALL VARIANTS
============================================================ */

router.get(
  "/carvariants",
  async (req, res) => {
    try {
      const variants =
        await CarVariant.find({})
          .select(
            "_id carModel title imageUrl"
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
        "GET VARIANTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get variants",
      });
    }
  }
);

/* ============================================================
   VARIANTS BY MODEL
============================================================ */

router.get(
  "/carvariants/model/:modelId",
  async (req, res) => {
    try {
      const { modelId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          modelId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid model id",
        });
      }

      const variants =
        await CarVariant.find({
          carModel: modelId,
        })
          .select(
            "_id carModel title imageUrl"
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
        "GET VARIANTS BY MODEL ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get variants by model",
      });
    }
  }
);

/* ============================================================
   VARIANTS BY BRAND
============================================================ */

router.get(
  "/carvariants/brand/:brandId",
  async (req, res) => {
    try {
      const { brandId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          brandId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand id",
        });
      }

      const models =
        await CarModel.find({
          brand: brandId,
        })
          .select("_id")
          .lean();

      const modelIds =
        models.map(
          (item) => item._id
        );

      const variants =
        modelIds.length
          ? await CarVariant.find({
              carModel: {
                $in: modelIds,
              },
            })
              .select(
                "_id carModel title imageUrl"
              )
              .sort({
                title: 1,
              })
              .lean()
          : [];

      return res.json({
        success: true,
        count: variants.length,
        variants,
      });
    } catch (error) {
      console.error(
        "GET VARIANTS BY BRAND ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get variants by brand",
      });
    }
  }
);

/* ============================================================
   GET ALL PUBLIC CARS
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
        fuel,
        transmission,
        owner,
        board,
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

      if (fuel) {
        filter.fuel = fuel;
      }

      if (transmission) {
        filter.transmission =
          transmission;
      }

      if (owner) {
        filter.owner = owner;
      }

      if (board) {
        filter.board = board;
      }

      if (insurance) {
        filter.insurance =
          insurance;
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

      const cars =
        await Car.find(filter)
          .sort({
            createdAt: -1,
          })
          .lean();

      const brandIds = [
        ...new Set(
          cars
            .map((car) =>
              car.brand
                ? car.brand.toString()
                : null
            )
            .filter(Boolean)
        ),
      ];

      const modelIds = [
        ...new Set(
          cars
            .map((car) =>
              car.model
                ? car.model.toString()
                : null
            )
            .filter(Boolean)
        ),
      ];

      const variantIds = [
        ...new Set(
          cars
            .map((car) =>
              car.variant
                ? car.variant.toString()
                : null
            )
            .filter(Boolean)
        ),
      ];

      const [
        brands,
        models,
        variants,
      ] = await Promise.all([
        CarBrand.find({
          _id: {
            $in: brandIds,
          },
        })
          .select(
            "_id name logoUrl"
          )
          .lean(),

        CarModel.find({
          _id: {
            $in: modelIds,
          },
        })
          .select(
            "_id title imageUrl brand"
          )
          .lean(),

        CarVariant.find({
          _id: {
            $in: variantIds,
          },
        })
          .select(
            "_id title imageUrl carModel"
          )
          .lean(),
      ]);

      const brandMap =
        new Map(
          brands.map(
            (item) => [
              item._id.toString(),
              item,
            ]
          )
        );

      const modelMap =
        new Map(
          models.map(
            (item) => [
              item._id.toString(),
              item,
            ]
          )
        );

      const variantMap =
        new Map(
          variants.map(
            (item) => [
              item._id.toString(),
              item,
            ]
          )
        );

      const isAdminUser =
        !!req.user &&
        req.user.role === "admin";

      const result =
        cars.map((car) => {
          if (car.brand) {
            car.brand =
              brandMap.get(
                car.brand.toString()
              ) || car.brand;
          }

          if (car.model) {
            car.model =
              modelMap.get(
                car.model.toString()
              ) || car.model;
          }

          if (car.variant) {
            car.variant =
              variantMap.get(
                car.variant.toString()
              ) || car.variant;
          }

          return prepareSellerForResponse(
            car,
            isAdminUser
          );
        });

      return res.json({
        success: true,
        count: result.length,
        cars: result,
      });
    } catch (error) {
      console.error(
        "Get cars error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get cars",
      });
    }
  }
);

/* ============================================================
   GET MY CARS
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
            "_id carModel title imageUrl"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      const responseCars =
        cars.map((car) => {
          const item = {
            ...car,
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
        });

      return res.json({
        success: true,
        count:
          responseCars.length,
        cars: responseCars,
      });
    } catch (error) {
      console.error(
        "Get my cars error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get my cars",
      });
    }
  }
);

/* ============================================================
   GET USER CARS
============================================================ */

router.get(
  "/my-cars",
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
            "_id carModel title imageUrl"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      const result =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            false
          )
        );

      return res.json({
        success: true,
        count: result.length,
        cars: result,
      });
    } catch (error) {
      console.error(
        "GET MY CARS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get user cars",
      });
    }
  }
);

/* ============================================================
   USER ADD CAR
   POST /api/cars/user-add
   POST /api/cars/
============================================================ */

router.post(
  ["/user-add", "/"],
  verifyToken,
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

        serviceRecord,
        csrKm,
        stig,

        color,
        fuel,
        transmission,
        owner,
        board,
        insurance,

        status,
        seller,
        sellerUser,
        sellerinfo,

        district,
        city,
        description,
      } = req.body;

      /* ======================================================
         BRAND REQUIRED
         MODEL OPTIONAL
         VARIANT OPTIONAL
      ====================================================== */

      await validateCarHierarchy(
        brand,
        model || null,
        variant || null
      );

      /* ======================================================
         REGISTRATION
      ====================================================== */

      const registration =
        validateRegistration(
          registrationState,
          registrationNumber
        );

      /* ======================================================
         CAR DATA
      ====================================================== */

      const carData = {
        ...req.body,

        brand,

        model:
          model || null,

        variant:
          variant || null,

        videoLink:
          videoLink ||
          req.body.videoLink ||
          null,

        registrationState:
          registration.registrationState,

        registrationNumber:
          registration.registrationNumber,

        year,
        price,
        km,

        serviceRecord:
          serviceRecord || null,

        csrKm:
          csrKm === "" ||
          csrKm === undefined
            ? null
            : csrKm,

        stig:
          stig || null,

        color:
          color || null,

        fuel,
        transmission,
        owner,
        board,

        insurance:
          insurance || null,

        status:
          status || "draft",

        /* SELLER OPTIONAL */
        seller:
          seller &&
          String(seller).trim()
            ? encryptSeller(
                String(seller).trim()
              )
            : null,

        sellerUser:
          sellerUser ||
          req.user.id,

        sellerinfo:
          sellerinfo || null,

        district,

        city:
          city || null,

        description:
          description || null,

        createdBy:
          req.user.id,
      };

      /* ======================================================
         MEDIA
      ====================================================== */

      const {
        bannerImage,
        galleryImages,
        audioNote,
        videos,
      } =
        await uploadCarMedia(
          req.files
        );

      carData.bannerImage =
        bannerImage;

      carData.galleryImages =
        galleryImages;

      carData.audioNote =
        audioNote;

      carData.videos =
        videos;

      /* ======================================================
         CREATE
      ====================================================== */

      const car =
        await Car.create(
          carData
        );

      const responseCar =
        car.toObject();

      prepareSellerForResponse(
        responseCar,
        false
      );

      return res.status(201).json({
        success: true,
        message:
          "Car created successfully",
        car: responseCar,
      });
    } catch (error) {
      console.error(
        "User create car error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to create car",
      });
    }
  }
);

/* ============================================================
   GET CAR BY ID
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
          message: "Invalid car id",
        });
      }

      const car =
        await Car.findById(id)
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
            "_id carModel title imageUrl"
          )
          .lean();

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      const isAdminUser =
        !!req.user &&
        req.user.role === "admin";

      if (
        !isAdminUser &&
        (
          car.status === "draft" ||
          car.status ===
            "delete_requested"
        )
      ) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      prepareSellerForResponse(
        car,
        isAdminUser
      );

      return res.json({
        success: true,
        car,
      });
    } catch (error) {
      console.error(
        "GET CAR BY ID ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get car",
      });
    }
  }
);

/* ============================================================
   USER / OWNER UPDATE CAR
   PUT /api/cars/:id
============================================================ */

router.put(
  "/:id",
  verifyToken,
  uploadCar.fields([
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
          message: "Invalid car id",
        });
      }

      const car =
        await Car.findById(id);

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      const isAdminUser =
        req.user.role === "admin";

      const isOwner =
        car.createdBy &&
        car.createdBy.toString() ===
          req.user.id.toString();

      const isSeller =
        car.sellerUser &&
        car.sellerUser.toString() ===
          req.user.id.toString();

      if (
        !isAdminUser &&
        !isOwner &&
        !isSeller
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to update this car",
        });
      }

      const {
        brand,
        model,
        variant,
      } = req.body;

      /* ======================================================
         OPTIONAL MODEL / VARIANT
      ====================================================== */

      const nextBrand =
        brand || car.brand;

      const nextModel =
        model === undefined
          ? car.model
          : model || null;

      const nextVariant =
        model !== undefined &&
        !model
          ? null
          : variant === undefined
            ? car.variant
            : variant || null;

      await validateCarHierarchy(
        nextBrand,
        nextModel,
        nextVariant
      );

      const updateData = {
        ...req.body,

        brand:
          nextBrand,

        model:
          nextModel,

        variant:
          nextVariant,
      };

      /* ======================================================
         SELLER OPTIONAL
      ====================================================== */

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

      /* ======================================================
         NULLABLE FIELDS
      ====================================================== */

      if (
        req.body.csrKm === ""
      ) {
        updateData.csrKm =
          null;
      }

      if (
        req.body.serviceRecord ===
        ""
      ) {
        updateData.serviceRecord =
          null;
      }

      if (
        req.body.insurance ===
        ""
      ) {
        updateData.insurance =
          null;
      }

      if (
        req.body.stig === ""
      ) {
        updateData.stig =
          null;
      }

      if (
        req.body.city === ""
      ) {
        updateData.city =
          null;
      }

      if (
        req.body.description ===
        ""
      ) {
        updateData.description =
          null;
      }

      /* ======================================================
         REGISTRATION
      ====================================================== */

      const registration =
        validateRegistration(
          req.body.registrationState !==
            undefined
            ? req.body
                .registrationState
            : car.registrationState,

          req.body.registrationNumber !==
            undefined
            ? req.body
                .registrationNumber
            : car.registrationNumber
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
        if (car.bannerImage) {
          await safeDeleteMedia(
            car.bannerImage
          );
        }

        updateData.bannerImage =
          await uploadCarImage(
            req.files.banner[0],
            "cars/banner"
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
            car.galleryImages
          )
            ? car.galleryImages.filter(
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
                uploadCarImage(
                  file,
                  "cars/gallery"
                )
            )
          );

        const oldGallery =
          Array.isArray(
            car.galleryImages
          )
            ? car.galleryImages
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
            car.galleryImages
          )
            ? car.galleryImages
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
        if (car.audioNote) {
          await safeDeleteMedia(
            car.audioNote
          );
        }

        updateData.audioNote =
          await uploadCarImage(
            req.files.audio[0],
            "cars/audio"
          );
      }

      /* ======================================================
         VIDEOS
      ====================================================== */

      const videoFiles = [
        ...(req.files?.video ||
          []),
        ...(req.files?.videos ||
          []),
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
            car.videos
          )
            ? car.videos.filter(
                (item) =>
                  typeof item ===
                    "string" &&
                  item.trim()
              )
            : [];
      }

      if (
        videoFiles.length
      ) {
        const newVideos =
          await Promise.all(
            videoFiles.map(
              (video) =>
                uploadCarImage(
                  video,
                  "cars/videos"
                )
            )
          );

        const oldVideos =
          Array.isArray(
            car.videos
          )
            ? car.videos
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
            car.videos
          )
            ? car.videos
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

      const updatedCar =
        await Car.findByIdAndUpdate(
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
            "_id carModel title imageUrl"
          )
          .lean();

      prepareSellerForResponse(
        updatedCar,
        isAdminUser
      );

      return res.json({
        success: true,
        message:
          "Car updated successfully",
        car: updatedCar,
      });
    } catch (error) {
      console.error(
        "UPDATE CAR ERROR:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to update car",
      });
    }
  }
);

export default router;