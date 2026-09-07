import express from "express";
import mongoose from "mongoose";

import Car from "../../models/car/car_model.js";
import CarBrand from "../../models/car/brand/car_brand_model.js";
import CarModel from "../../models/car/model/car_model_model.js";
import CarVariant from "../../models/car/variant/car_variant_model.js";

import { verifyToken, isAdmin } from "../../middleware/auth.js";
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

const REGISTRATION_STATES = [
  "TN", "AP", "AR", "AS", "BR", "CG", "GA", "GJ", "HR", "HP",
  "JH", "KA", "KL", "MP", "MH", "MN", "ML", "MZ", "NL", "OD",
  "PB", "RJ", "SK", "TS", "TR", "UP", "UK", "WB", "AN", "CH",
  "DN", "DL", "JK", "LA", "LD", "PY",
];

const prepareSellerForResponse = (car) => {
  if (!car) return car;

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

const validateCarHierarchy = async (
  brand,
  model,
  variant = null
) => {
  if (!mongoose.Types.ObjectId.isValid(brand)) {
    throw new Error("Invalid brand id");
  }

  if (!mongoose.Types.ObjectId.isValid(model)) {
    throw new Error("Invalid model id");
  }

  const [brandDoc, modelDoc] = await Promise.all([
    CarBrand.findById(brand)
      .select("_id")
      .lean(),

    CarModel.findById(model)
      .select("_id brand brandId carBrand")
      .lean(),
  ]);

  if (!brandDoc) {
    throw new Error("Brand not found");
  }

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

  if (variant) {
    if (!mongoose.Types.ObjectId.isValid(variant)) {
      throw new Error("Invalid variant id");
    }

    const variantDoc =
      await CarVariant.findById(variant)
        .select("_id carModel model modelId")
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

const uploadCarMedia = async (files) => {
  const bannerImage = files?.banner?.length
    ? await uploadCarImage(
        files.banner[0],
        "cars/banner"
      )
    : null;

  const galleryImages = files?.gallery?.length
    ? await Promise.all(
        files.gallery.map((file) =>
          uploadCarImage(
            file,
            "cars/gallery"
          )
        )
      )
    : [];

  const audioNote = files?.audio?.length
    ? await uploadCarImage(
        files.audio[0],
        "cars/audio"
      )
    : null;

  const videoFiles = [
    ...(files?.video || []),
    ...(files?.videos || []),
  ];

  const videos = videoFiles.length
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
   MASTER DATA
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

router.get(
  "/carmodels/brand/:brandId",
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

router.get(
  "/carvariants/model/:modelId",
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

router.get(
  "/carvariants/brand/:brandId",
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

router.get(
  "/meta/brands",
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
        "GET META BRANDS ERROR:",
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

router.get(
  "/meta/models",
  async (req, res) => {
    try {
      const {
        brand,
      } = req.query;

      const filter = {};

      if (brand) {
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

        filter.brand = brand;
      }

      const models =
        await CarModel.find(filter)
          .select(
            "_id title imageUrl brand"
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
        "GET META MODELS ERROR:",
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

router.get(
  "/meta/variants",
  async (req, res) => {
    try {
      const {
        model,
      } = req.query;

      const filter = {};

      if (model) {
        if (
          !mongoose.Types.ObjectId.isValid(
            model
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid model id",
          });
        }

        filter.carModel = model;
      }

      const variants =
        await CarVariant.find(filter)
          .select(
            "_id title imageUrl carModel"
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
        "GET META VARIANTS ERROR:",
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
   ADMIN ADD
   POST /api/cars/admin/add
============================================================ */

router.post(
  "/add",

  verifyToken,
  isAdmin,

  uploadCar.fields(
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

      const registration =
        validateRegistration(
          registrationState,
          registrationNumber
        );

      await validateCarHierarchy(
        brand,
        model,
        variant || null
      );

      const {
        bannerImage,
        galleryImages,
        audioNote,
        videos,
      } =
        await uploadCarMedia(
          req.files
        );

      const finalSeller =
        seller &&
        typeof seller === "string"
          ? encryptSeller(seller)
          : seller || undefined;

      const car =
        await Car.create({
          ...req.body,

          brand,
          model,

          variant:
            variant || null,

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
            status || "available",

          seller:
            finalSeller,

          sellerUser:
            sellerUser || null,

          sellerinfo:
            sellerinfo || null,

          district,

          city:
            city || null,

          description:
            description || null,

          bannerImage,
          galleryImages,
          audioNote,
          videos,

          videoLink:
            videoLink || null,

          createdBy:
            req.user.id,
        });

      const responseCar =
        prepareSellerForResponse(
          car.toObject()
        );

      return res.status(201).json({
        success: true,

        message:
          "Car added successfully",

        car:
          responseCar,
      });
    } catch (error) {
      console.error(
        "ADMIN ADD CAR ERROR:",
        error
      );

      return res.status(400).json({
        success: false,

        message:
          error.message ||
          "Failed to add car",
      });
    }
  }
);

/* ============================================================
   ADMIN GET ALL
   GET /api/cars/admin/all
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
          {
            seller: {
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
      ] =
        await Promise.all([
          brandIds.length
            ? CarBrand.find({
                _id: {
                  $in: brandIds,
                },
              })
                .select(
                  "_id name logoUrl"
                )
                .lean()
            : [],

          modelIds.length
            ? CarModel.find({
                _id: {
                  $in: modelIds,
                },
              })
                .select(
                  "_id title imageUrl brand"
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
                  "_id title imageUrl carModel"
                )
                .lean()
            : [],
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
            car
          );
        });

      return res.json({
        success: true,
        count: result.length,
        cars: result,
      });
    } catch (error) {
      console.error(
        "ADMIN GET ALL CARS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get all cars",
      });
    }
  }
);

/* ============================================================
   ADMIN GET ONE
   GET /api/cars/admin/:id
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
            "Invalid car id",
        });
      }

      const car =
        await Car.findById(id)
          .populate(
            "brand",
            "name logoUrl"
          )
          .populate(
            "model",
            "title imageUrl brand"
          )
          .populate(
            "variant",
            "title imageUrl carModel"
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

      if (!car) {
        return res.status(404).json({
          success: false,
          message:
            "Car not found",
        });
      }

      return res.json({
        success: true,

        car:
          prepareSellerForResponse(
            car
          ),
      });
    } catch (error) {
      console.error(
        "ADMIN GET CAR ERROR:",
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
   ADMIN STATUS
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
            "Invalid car id",
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
            "Invalid car status",
        });
      }

      const car =
        await Car.findById(id);

      if (!car) {
        return res.status(404).json({
          success: false,
          message:
            "Car not found",
        });
      }

      car.status =
        status;

      await car.save();

      const responseCar =
        await Car.findById(id)
          .populate(
            "brand",
            "name logoUrl"
          )
          .populate(
            "model",
            "title imageUrl brand"
          )
          .populate(
            "variant",
            "title imageUrl carModel"
          )
          .lean();

      return res.json({
        success: true,

        message:
          "Car status updated successfully",

        car:
          prepareSellerForResponse(
            responseCar
          ),
      });
    } catch (error) {
      console.error(
        "ADMIN STATUS ERROR:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to update car status",
      });
    }
  }
);

/* ============================================================
   ADMIN UPDATE
   PUT /api/cars/admin/:id
============================================================ */

router.put(
  "/:id",

  verifyToken,
  isAdmin,

  uploadCar.fields(
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
            "Invalid car id",
        });
      }

      const car =
        await Car.findById(id);

      if (!car) {
        return res.status(404).json({
          success: false,
          message:
            "Car not found",
        });
      }

      const finalBrand =
        req.body.brand !==
        undefined
          ? req.body.brand
          : car.brand;

      const finalModel =
        req.body.model !==
        undefined
          ? req.body.model
          : car.model;

      const finalVariant =
        req.body.variant !==
        undefined
          ? req.body.variant
          : car.variant;

      await validateCarHierarchy(
        finalBrand,
        finalModel,
        finalVariant ||
          null
      );

      const registration =
        validateRegistration(
          req.body.registrationState !==
            undefined
            ? req.body.registrationState
            : car.registrationState,

          req.body.registrationNumber !==
            undefined
            ? req.body.registrationNumber
            : car.registrationNumber
        );

      const allowedFields = [
        "brand",
        "model",
        "variant",

        "year",
        "price",
        "km",

        "serviceRecord",
        "csrKm",
        "stig",

        "color",
        "fuel",
        "transmission",
        "owner",
        "board",
        "insurance",

        "status",

        "sellerUser",
        "sellerinfo",

        "district",
        "city",

        "description",

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
          car[field] =
            req.body[field];
        }
      }

      car.brand =
        finalBrand;

      car.model =
        finalModel;

      car.variant =
        finalVariant ||
        null;

      car.registrationState =
        registration.registrationState;

      car.registrationNumber =
        registration.registrationNumber;

      if (
        req.body.seller !==
        undefined
      ) {
        car.seller =
          req.body.seller &&
          typeof req.body.seller ===
            "string"
            ? encryptSeller(
                req.body.seller
              )
            : req.body.seller ||
              null;
      }

      if (
        req.body.csrKm ===
        ""
      ) {
        car.csrKm =
          null;
      }

      if (
        req.body.serviceRecord ===
        ""
      ) {
        car.serviceRecord =
          null;
      }

      if (
        req.body.insurance ===
        ""
      ) {
        car.insurance =
          null;
      }

      if (
        req.body.stig ===
        ""
      ) {
        car.stig =
          null;
      }

      if (
        req.body.city ===
        ""
      ) {
        car.city =
          null;
      }

      if (
        req.body.description ===
        ""
      ) {
        car.description =
          null;
      }

      if (
        req.body.videoLink ===
        ""
      ) {
        car.videoLink =
          null;
      }

      /* ======================================================
         BANNER
      ====================================================== */

      if (
        req.files?.banner?.length
      ) {
        await safeDeleteMedia(
          car.bannerImage
        );

        car.bannerImage =
          await uploadCarImage(
            req.files.banner[0],
            "cars/banner"
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
            car.galleryImages
          )
        ) {
          for (
            const oldImage of
              car.galleryImages
          ) {
            await safeDeleteMedia(
              oldImage
            );
          }
        }

        car.galleryImages =
          await Promise.all(
            req.files.gallery.map(
              (image) =>
                uploadCarImage(
                  image,
                  "cars/gallery"
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
          car.audioNote
        );

        car.audioNote =
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

      if (
        videoFiles.length
      ) {
        if (
          Array.isArray(
            car.videos
          )
        ) {
          for (
            const oldVideo of
              car.videos
          ) {
            await safeDeleteMedia(
              oldVideo
            );
          }
        }

        car.videos =
          await Promise.all(
            videoFiles.map(
              (video) =>
                uploadCarImage(
                  video,
                  "cars/videos"
                )
            )
          );
      }

      await car.save();

      return res.json({
        success: true,

        message:
          "Car updated successfully",

        car:
          prepareSellerForResponse(
            car.toObject()
          ),
      });
    } catch (error) {
      console.error(
        "ADMIN UPDATE CAR ERROR:",
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

/* ============================================================
   ADMIN DELETE
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
            "Invalid car id",
        });
      }

      const car =
        await Car.findById(id);

      if (!car) {
        return res.status(404).json({
          success: false,
          message:
            "Car not found",
        });
      }

      await safeDeleteMedia(
        car.bannerImage
      );

      if (
        Array.isArray(
          car.galleryImages
        )
      ) {
        for (
          const image of
            car.galleryImages
        ) {
          await safeDeleteMedia(
            image
          );
        }
      }

      await safeDeleteMedia(
        car.audioNote
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
          await safeDeleteMedia(
            video
          );
        }
      }

      await car.deleteOne();

      return res.json({
        success: true,

        message:
          "Car deleted successfully",
      });
    } catch (error) {
      console.error(
        "ADMIN DELETE CAR ERROR:",
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
            "Invalid car id",
        });
      }

      const car =
        await Car.findById(id);

      if (!car) {
        return res.status(404).json({
          success: false,
          message:
            "Car not found",
        });
      }

      car.status =
        "available";

      await car.save();

      const responseCar =
        await Car.findById(id)
          .populate(
            "brand",
            "name logoUrl"
          )
          .populate(
            "model",
            "title imageUrl brand"
          )
          .populate(
            "variant",
            "title imageUrl carModel"
          )
          .lean();

      return res.json({
        success: true,

        message:
          "Car approved successfully",

        car:
          prepareSellerForResponse(
            responseCar
          ),
      });
    } catch (error) {
      console.error(
        "ADMIN APPROVE CAR ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Failed to approve car",
      });
    }
  }
);

/* ============================================================
   ADMIN REJECT
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
            "Invalid car id",
        });
      }

      const car =
        await Car.findById(id);

      if (!car) {
        return res.status(404).json({
          success: false,
          message:
            "Car not found",
        });
      }

      car.status =
        "draft";

      await car.save();

      const responseCar =
        await Car.findById(id)
          .populate(
            "brand",
            "name logoUrl"
          )
          .populate(
            "model",
            "title imageUrl brand"
          )
          .populate(
            "variant",
            "title imageUrl carModel"
          )
          .lean();

      return res.json({
        success: true,

        message:
          "Car moved to draft successfully",

        car:
          prepareSellerForResponse(
            responseCar
          ),
      });
    } catch (error) {
      console.error(
        "ADMIN REJECT CAR ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Failed to reject car",
      });
    }
  }
);

export default router;