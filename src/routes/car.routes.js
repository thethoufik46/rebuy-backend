import express from "express";
import mongoose from "mongoose";

import Car from "../models/car_model.js";
import User from "../models/user_model.js";
import CarBrand from "../models/car/brand/car_brand_model.js";
import CarVariant from "../models/car/variant/car_variant_model.js";
import CarModel from "../models/car/model/car_model_model.js";

import {
  verifyToken,
  isAdmin,
} from "../middleware/auth.js";

import {
  verifyTokenOptional,
} from "../middleware/verifyTokenOptional.js";

import uploadCar from "../middleware/uploadCar.js";

import {
  encryptSeller,
  decryptSeller,
} from "../utils/sellerCrypto.js";

import Counter from "../models/counter_model.js";

const router = express.Router();

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
    } catch (_) {
      // Keep encrypted value if decryption fails
    }
  }

  return car;
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
      .select("_id brand")
      .lean(),
  ]);

  if (!brandDoc) {
    throw new Error("Brand not found");
  }

  if (!modelDoc) {
    throw new Error("Model not found");
  }

  if (
    modelDoc.brand.toString() !==
    brand.toString()
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
        .select("_id carModel")
        .lean();

    if (!variantDoc) {
      throw new Error("Variant not found");
    }

    if (
      variantDoc.carModel.toString() !==
      model.toString()
    ) {
      throw new Error(
        "Selected variant does not belong to selected model"
      );
    }
  }
};

/* =========================================================
   CAR BRAND / MODEL / VARIANT MASTER DATA
   Flutter CarApi compatible routes
========================================================= */

router.get("/brands", async (req, res) => {
  try {
    const brands = await CarBrand.find({})
      .select("_id name logoUrl")
      .sort({ name: 1 })
      .lean();

    return res.json({
      success: true,
      count: brands.length,
      brands,
    });
  } catch (error) {
    console.error("GET BRANDS ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to get brands",
    });
  }
});

router.get("/carmodels", async (req, res) => {
  try {
    const models = await CarModel.find({})
      .select("_id brand title imageUrl")
      .sort({ title: 1 })
      .lean();

    return res.json({
      success: true,
      count: models.length,
      models,
    });
  } catch (error) {
    console.error("GET MODELS ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to get models",
    });
  }
});

router.get(
  "/carmodels/brand/:brandId",
  async (req, res) => {
    try {
      const { brandId } = req.params;

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

      const models = await CarModel.find({
        brand: brandId,
      })
        .select("_id brand title imageUrl")
        .sort({ title: 1 })
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
      const variants = await CarVariant.find({})
        .select(
          "_id carModel title imageUrl"
        )
        .sort({ title: 1 })
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
      const { modelId } = req.params;

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
          .sort({ title: 1 })
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

/* Older Flutter compatibility */
router.get(
  "/carvariants/brand/:brandId",
  async (req, res) => {
    try {
      const { brandId } = req.params;

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

      const models = await CarModel.find({
        brand: brandId,
      })
        .select("_id")
        .lean();

      const modelIds = models.map(
        (item) => item._id
      );

      const variants = modelIds.length
        ? await CarVariant.find({
            carModel: {
              $in: modelIds,
            },
          })
            .select(
              "_id carModel title imageUrl"
            )
            .sort({ title: 1 })
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

/* =========================================================
   CREATE CAR - ADMIN
========================================================= */

router.post(
  ["/add", "/admin"],
  verifyToken,
  isAdmin,
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

      await validateCarHierarchy(
        brand,
        model,
        variant || null
      );

      const carData = {
        ...req.body,

        brand,
        model,
        variant: variant || null,

        videoLink:
          videoLink ||
          req.body.videoLink ||
          null,

        registrationState:
          registrationState || "TN",

        registrationNumber,

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

        seller:
          seller
            ? encryptSeller(seller)
            : undefined,

        sellerUser:
          sellerUser || undefined,

        sellerinfo,

        district,

        city:
          city || null,

        description:
          description || null,

        createdBy: req.user.id,
      };

      if (
        req.files &&
        req.files.banner &&
        req.files.banner[0]
      ) {
        carData.bannerImage =
          req.files.banner[0].path;
      }

      if (
        req.files &&
        req.files.gallery
      ) {
        carData.galleryImages =
          req.files.gallery.map(
            (file) => file.path
          );
      }

      if (
        req.files &&
        req.files.audio &&
        req.files.audio[0]
      ) {
        carData.audioNote =
          req.files.audio[0].path;
      }

      if (
        req.files &&
        req.files.videos
      ) {
        carData.videos =
          req.files.videos.map(
            (file) => file.path
          );
      }

      const car =
        await Car.create(carData);

      const responseCar =
        car.toObject();

      prepareSellerForResponse(
        responseCar,
        true
      );

      return res.status(201).json({
        success: true,
        message:
          "Car created successfully",
        car: responseCar,
      });
    } catch (error) {
      console.error(
        "Admin create car error:",
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


/* =========================================================
   CREATE CAR - USER
========================================================= */

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
      name: "videos",
      maxCount: 3,
    },
  ]),
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

        seller,
        sellerinfo,

        district,
        city,
        description,

        videoLink,
      } = req.body;

      if (!brand) {
        return res.status(400).json({
          success: false,
          message: "Brand is required",
        });
      }

      if (!model) {
        return res.status(400).json({
          success: false,
          message: "Model is required",
        });
      }

      await validateCarHierarchy(
        brand,
        model,
        variant || null
      );

      if (
        !req.files ||
        !req.files.banner ||
        !req.files.banner[0]
      ) {
        return res.status(400).json({
          success: false,
          message: "Banner image is required",
        });
      }

      const carData = {
        ...req.body,

        brand,
        model,
        variant: variant || null,

        registrationState:
          registrationState || "TN",

        registrationNumber,

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

        status: "draft",

        seller:
          seller
            ? encryptSeller(seller)
            : undefined,

        sellerinfo,

        district,

        city:
          city || null,

        description:
          description || null,

        videoLink:
          videoLink || null,

        createdBy: req.user.id,

        sellerUser: req.user.id,
      };

      carData.bannerImage =
        req.files.banner[0].path;

      if (
        req.files.gallery &&
        req.files.gallery.length
      ) {
        carData.galleryImages =
          req.files.gallery.map(
            (file) => file.path
          );
      } else {
        carData.galleryImages = [];
      }

      if (
        req.files.audio &&
        req.files.audio[0]
      ) {
        carData.audioNote =
          req.files.audio[0].path;
      } else {
        carData.audioNote = null;
      }

      if (
        req.files.videos &&
        req.files.videos.length
      ) {
        carData.videos =
          req.files.videos.map(
            (file) => file.path
          );
      } else {
        carData.videos = [];
      }

      const car =
        await Car.create(carData);

      const responseCar =
        car.toObject();

      prepareSellerForResponse(
        responseCar,
        false
      );

      return res.status(201).json({
        success: true,
        message:
          "Car submitted successfully",
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

/* =========================================================
   GET ALL CARS / FILTER
========================================================= */

router.get(
  "/",
  verifyTokenOptional,
  async (req, res) => {
    try {
      const {
        brand,
        model,
        variant,

        fuel,
        transmission,

        district,
        city,

        minPrice,
        maxPrice,

        minYear,
        maxYear,

        registrationState,
        registrationNumber,

        status,
      } = req.query;

      const filter = {};

      if (brand) {
        if (
          mongoose.Types.ObjectId.isValid(
            brand
          )
        ) {
          filter.brand = brand;
        }
      }

      if (model) {
        if (
          mongoose.Types.ObjectId.isValid(
            model
          )
        ) {
          filter.model = model;
        }
      }

      if (variant) {
        if (
          mongoose.Types.ObjectId.isValid(
            variant
          )
        ) {
          filter.variant = variant;
        }
      }

      if (fuel) {
        filter.fuel = fuel;
      }

      if (transmission) {
        filter.transmission =
          transmission;
      }

      if (district) {
        filter.district = district;
      }

      if (city) {
        filter.city = city;
      }

      if (registrationState) {
        filter.registrationState =
          String(
            registrationState
          ).toUpperCase();
      }

      if (registrationNumber) {
        filter.registrationNumber =
          String(
            registrationNumber
          ).trim();
      }

      if (
        minPrice !== undefined ||
        maxPrice !== undefined
      ) {
        filter.price = {};

        if (minPrice !== undefined) {
          filter.price.$gte =
            Number(minPrice);
        }

        if (maxPrice !== undefined) {
          filter.price.$lte =
            Number(maxPrice);
        }
      }

      if (
        minYear !== undefined ||
        maxYear !== undefined
      ) {
        filter.year = {};

        if (minYear !== undefined) {
          filter.year.$gte =
            Number(minYear);
        }

        if (maxYear !== undefined) {
          filter.year.$lte =
            Number(maxYear);
        }
      }

      if (status) {
        filter.status = status;
      } else {
        filter.status = {
          $ne: "delete_requested",
        };
      }

      const cars = await Car.find(filter)
        .populate(
          "brand",
          "_id name logoUrl"
        )
        .populate(
          "model",
          "_id title imageUrl brand"
        )
        .populate(
          "variant",
          "_id title imageUrl carModel"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      const isAdminUser =
        !!req.user &&
        (
          req.user.role === "admin" ||
          req.user.isAdmin === true
        );

      const preparedCars =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            isAdminUser
          )
        );

      return res.json({
        success: true,
        count: preparedCars.length,
        cars: preparedCars,
      });
    } catch (error) {
      console.error(
        "GET CARS ERROR:",
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

/* =========================================================
   GET ALL CARS - ADMIN
========================================================= */

router.get(
  "/admin/all",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const cars = await Car.find({})
        .populate(
          "brand",
          "_id name logoUrl"
        )
        .populate(
          "model",
          "_id title imageUrl brand"
        )
        .populate(
          "variant",
          "_id title imageUrl carModel"
        )
        .populate(
          "createdBy",
          "_id name email phone"
        )
        .populate(
          "sellerUser",
          "_id name email phone"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      const preparedCars =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            true
          )
        );

      return res.json({
        success: true,
        count: preparedCars.length,
        cars: preparedCars,
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

/* =========================================================
   GET MY CARS
   Flutter: /cars/my-cars
========================================================= */

router.get(
  "/my-cars",
  verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const cars = await Car.find({
        $or: [
          {
            createdBy: userId,
          },
          {
            sellerUser: userId,
          },
        ],
      })
        .populate(
          "brand",
          "_id name logoUrl"
        )
        .populate(
          "model",
          "_id title imageUrl brand"
        )
        .populate(
          "variant",
          "_id title imageUrl carModel"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      const preparedCars =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            false
          )
        );

      return res.json({
        success: true,
        count: preparedCars.length,
        cars: preparedCars,
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
          "Failed to get my cars",
      });
    }
  }
);

/* =========================================================
   LEGACY GET MY CARS
========================================================= */

router.get(
  "/my",
  verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const cars = await Car.find({
        $or: [
          {
            createdBy: userId,
          },
          {
            sellerUser: userId,
          },
        ],
      })
        .populate(
          "brand",
          "_id name logoUrl"
        )
        .populate(
          "model",
          "_id title imageUrl brand"
        )
        .populate(
          "variant",
          "_id title imageUrl carModel"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      const preparedCars =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            false
          )
        );

      return res.json({
        success: true,
        count: preparedCars.length,
        cars: preparedCars,
      });
    } catch (error) {
      console.error(
        "GET MY CARS LEGACY ERROR:",
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

/* =========================================================
   GET GROUPED MY CARS
========================================================= */

router.get(
  "/my-cars/grouped",
  verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const cars = await Car.find({
        $or: [
          {
            createdBy: userId,
          },
          {
            sellerUser: userId,
          },
        ],
      })
        .populate(
          "brand",
          "_id name logoUrl"
        )
        .populate(
          "model",
          "_id title imageUrl brand"
        )
        .populate(
          "variant",
          "_id title imageUrl carModel"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      const preparedCars =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            false
          )
        );

      const drafts =
        preparedCars.filter(
          (car) =>
            car.status === "draft"
        );

      const listings =
        preparedCars.filter(
          (car) =>
            car.status !== "draft"
        );

      return res.json({
        success: true,

        drafts,
        listings,

        cars: preparedCars,
      });
    } catch (error) {
      console.error(
        "GROUPED MY CARS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get grouped cars",
      });
    }
  }
);

/* =========================================================
   GET CAR BY ID
========================================================= */

router.get(
  "/:id",
  verifyTokenOptional,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const numericId =
          Number(id);

        if (
          !Number.isNaN(numericId)
        ) {
          const car =
            await Car.findOne({
              carId: numericId,
            })
              .populate(
                "brand",
                "_id name logoUrl"
              )
              .populate(
                "model",
                "_id title imageUrl brand"
              )
              .populate(
                "variant",
                "_id title imageUrl carModel"
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
            (
              req.user.role === "admin" ||
              req.user.isAdmin === true
            );

          prepareSellerForResponse(
            car,
            isAdminUser
          );

          return res.json({
            success: true,
            car,
          });
        }

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
            "_id title imageUrl brand"
          )
          .populate(
            "variant",
            "_id title imageUrl carModel"
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
        (
          req.user.role === "admin" ||
          req.user.isAdmin === true
        );

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


/* =========================================================
   UPDATE CAR
   Flutter: PUT /cars/:carId
========================================================= */

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
      name: "videos",
      maxCount: 10,
    },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;

      let car = null;

      if (mongoose.Types.ObjectId.isValid(id)) {
        car = await Car.findById(id);
      }

      if (!car && !Number.isNaN(Number(id))) {
        car = await Car.findOne({
          carId: Number(id),
        });
      }

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      const isAdminUser =
        req.user.role === "admin" ||
        req.user.isAdmin === true;

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
            "You are not authorized to update this car",
        });
      }

      const {
        brand,
        model,
        variant,

        existingGallery,
        existingVideos,
      } = req.body;

      const nextBrand =
        brand || car.brand;

      const nextModel =
        model || car.model;

      const nextVariant =
        variant !== undefined
          ? variant || null
          : car.variant;

      await validateCarHierarchy(
        nextBrand,
        nextModel,
        nextVariant || null
      );

      const allowedFields = [
        "brand",
        "model",
        "variant",

        "registrationState",
        "registrationNumber",

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

      for (const field of allowedFields) {
        if (
          req.body[field] !== undefined
        ) {
          if (
            field === "variant"
          ) {
            car[field] =
              req.body[field] || null;
          } else if (
            field === "csrKm"
          ) {
            car[field] =
              req.body[field] === ""
                ? null
                : req.body[field];
          } else if (
            field === "stig"
          ) {
            car[field] =
              req.body[field] === ""
                ? null
                : req.body[field];
          } else if (
            field === "city"
          ) {
            car[field] =
              req.body[field] === ""
                ? null
                : req.body[field];
          } else if (
            field === "description"
          ) {
            car[field] =
              req.body[field] === ""
                ? null
                : req.body[field];
          } else if (
            field === "videoLink"
          ) {
            car[field] =
              req.body[field] === ""
                ? null
                : req.body[field];
          } else {
            car[field] =
              req.body[field];
          }
        }
      }

      /* -----------------------------------------------------
         SELLER
      ----------------------------------------------------- */

      if (
        req.body.seller !== undefined
      ) {
        if (
          req.body.seller === ""
        ) {
          car.seller = null;
        } else if (
          !String(
            req.body.seller
          ).includes(":")
        ) {
          car.seller =
            encryptSeller(
              req.body.seller
            );
        } else {
          car.seller =
            req.body.seller;
        }
      }

      /* -----------------------------------------------------
         BANNER
      ----------------------------------------------------- */

      if (
        req.files &&
        req.files.banner &&
        req.files.banner[0]
      ) {
        car.bannerImage =
          req.files.banner[0].path;
      }

      /* -----------------------------------------------------
         EXISTING GALLERY
         Flutter sends JSON string
      ----------------------------------------------------- */

      let galleryToKeep = [];

      if (
        existingGallery !==
        undefined
      ) {
        try {
          const parsed =
            JSON.parse(
              existingGallery
            );

          if (Array.isArray(parsed)) {
            galleryToKeep =
              parsed.filter(
                (item) =>
                  typeof item ===
                  "string" &&
                  item.trim() !== ""
              );
          }
        } catch (error) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid existingGallery format",
          });
        }
      } else if (
        Array.isArray(
          car.galleryImages
        )
      ) {
        galleryToKeep = [
          ...car.galleryImages,
        ];
      }

      if (
        req.files &&
        req.files.gallery &&
        req.files.gallery.length
      ) {
        galleryToKeep.push(
          ...req.files.gallery.map(
            (file) => file.path
          )
        );
      }

      car.galleryImages =
        galleryToKeep;

      /* -----------------------------------------------------
         EXISTING VIDEOS
         Flutter sends JSON string
      ----------------------------------------------------- */

      let videosToKeep = [];

      if (
        existingVideos !==
        undefined
      ) {
        try {
          const parsed =
            JSON.parse(
              existingVideos
            );

          if (Array.isArray(parsed)) {
            videosToKeep =
              parsed.filter(
                (item) =>
                  typeof item ===
                  "string" &&
                  item.trim() !== ""
              );
          }
        } catch (error) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid existingVideos format",
          });
        }
      } else if (
        Array.isArray(car.videos)
      ) {
        videosToKeep = [
          ...car.videos,
        ];
      }

      if (
        req.files &&
        req.files.videos &&
        req.files.videos.length
      ) {
        videosToKeep.push(
          ...req.files.videos.map(
            (file) => file.path
          )
        );
      }

      car.videos = videosToKeep;

      /* -----------------------------------------------------
         AUDIO
      ----------------------------------------------------- */

      if (
        req.files &&
        req.files.audio &&
        req.files.audio[0]
      ) {
        car.audioNote =
          req.files.audio[0].path;
      }

      await car.save();

      const updatedCar =
        await Car.findById(
          car._id
        )
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id title imageUrl brand"
          )
          .populate(
            "variant",
            "_id title imageUrl carModel"
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

/* =========================================================
   REQUEST DELETE
   Flutter: PUT /cars/:carId/request-delete
========================================================= */

router.put(
  "/:id/request-delete",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      let car = null;

      if (
        mongoose.Types.ObjectId.isValid(id)
      ) {
        car =
          await Car.findById(id);
      }

      if (
        !car &&
        !Number.isNaN(Number(id))
      ) {
        car =
          await Car.findOne({
            carId: Number(id),
          });
      }

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      const isAdminUser =
        req.user.role === "admin" ||
        req.user.isAdmin === true;

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
            "You are not authorized to delete this car",
        });
      }

      if (isAdminUser) {
        await Car.deleteOne({
          _id: car._id,
        });

        return res.json({
          success: true,
          message:
            "Car deleted successfully",
          deleted: true,
        });
      }

      car.status =
        "delete_requested";

      await car.save();

      return res.json({
        success: true,
        message:
          "Delete request submitted successfully",
        car: {
          _id: car._id,
          carId: car.carId,
          status: car.status,
        },
      });
    } catch (error) {
      console.error(
        "REQUEST DELETE CAR ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to request car deletion",
      });
    }
  }
);

/* =========================================================
   DELETE CAR - ADMIN / OWNER
========================================================= */

router.delete(
  "/:id",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      let car = null;

      if (
        mongoose.Types.ObjectId.isValid(id)
      ) {
        car =
          await Car.findById(id);
      }

      if (
        !car &&
        !Number.isNaN(Number(id))
      ) {
        car =
          await Car.findOne({
            carId: Number(id),
          });
      }

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      const isAdminUser =
        req.user.role === "admin" ||
        req.user.isAdmin === true;

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
            "You are not authorized to delete this car",
        });
      }

      await Car.deleteOne({
        _id: car._id,
      });

      return res.json({
        success: true,
        message:
          "Car deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE CAR ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to delete car",
      });
    }
  }
);

/* =========================================================
   ADMIN - DELETE REQUESTS
========================================================= */

router.get(
  "/admin/delete-requests",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const cars =
        await Car.find({
          status:
            "delete_requested",
        })
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id title imageUrl brand"
          )
          .populate(
            "variant",
            "_id title imageUrl carModel"
          )
          .populate(
            "createdBy",
            "_id name email phone"
          )
          .populate(
            "sellerUser",
            "_id name email phone"
          )
          .sort({
            updatedAt: -1,
          })
          .lean();

      const preparedCars =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            true
          )
        );

      return res.json({
        success: true,
        count: preparedCars.length,
        cars: preparedCars,
      });
    } catch (error) {
      console.error(
        "GET DELETE REQUESTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get delete requests",
      });
    }
  }
);

/* =========================================================
   ADMIN - APPROVE DELETE REQUEST
========================================================= */

router.put(
  "/admin/:id/approve-delete",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      let car = null;

      if (
        mongoose.Types.ObjectId.isValid(id)
      ) {
        car =
          await Car.findById(id);
      }

      if (
        !car &&
        !Number.isNaN(Number(id))
      ) {
        car =
          await Car.findOne({
            carId: Number(id),
          });
      }

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      await Car.deleteOne({
        _id: car._id,
      });

      return res.json({
        success: true,
        message:
          "Delete request approved and car deleted",
      });
    } catch (error) {
      console.error(
        "APPROVE DELETE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to approve delete request",
      });
    }
  }
);

/* =========================================================
   ADMIN - REJECT DELETE REQUEST
========================================================= */

router.put(
  "/admin/:id/reject-delete",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      let car = null;

      if (
        mongoose.Types.ObjectId.isValid(id)
      ) {
        car =
          await Car.findById(id);
      }

      if (
        !car &&
        !Number.isNaN(Number(id))
      ) {
        car =
          await Car.findOne({
            carId: Number(id),
          });
      }

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      car.status =
        "available";

      await car.save();

      return res.json({
        success: true,
        message:
          "Delete request rejected",
        car: {
          _id: car._id,
          carId: car.carId,
          status: car.status,
        },
      });
    } catch (error) {
      console.error(
        "REJECT DELETE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to reject delete request",
      });
    }
  }
);


/* =========================================================
   ADMIN - PENDING CARS
========================================================= */

router.get(
  "/admin/pending",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const cars = await Car.find({
        status: "draft",
      })
        .populate(
          "brand",
          "_id name logoUrl"
        )
        .populate(
          "model",
          "_id title imageUrl brand"
        )
        .populate(
          "variant",
          "_id title imageUrl carModel"
        )
        .populate(
          "createdBy",
          "_id name email phone"
        )
        .populate(
          "sellerUser",
          "_id name email phone"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      const preparedCars =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            true
          )
        );

      return res.json({
        success: true,
        count: preparedCars.length,
        cars: preparedCars,
      });
    } catch (error) {
      console.error(
        "GET PENDING CARS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get pending cars",
      });
    }
  }
);

/* =========================================================
   ADMIN - APPROVE CAR
========================================================= */

router.put(
  "/admin/:id/approve",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      let car = null;

      if (
        mongoose.Types.ObjectId.isValid(id)
      ) {
        car =
          await Car.findById(id);
      }

      if (
        !car &&
        !Number.isNaN(Number(id))
      ) {
        car =
          await Car.findOne({
            carId: Number(id),
          });
      }

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      car.status =
        "available";

      await car.save();

      const updatedCar =
        await Car.findById(
          car._id
        )
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id title imageUrl brand"
          )
          .populate(
            "variant",
            "_id title imageUrl carModel"
          )
          .lean();

      prepareSellerForResponse(
        updatedCar,
        true
      );

      return res.json({
        success: true,
        message:
          "Car approved successfully",
        car: updatedCar,
      });
    } catch (error) {
      console.error(
        "APPROVE CAR ERROR:",
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

/* =========================================================
   ADMIN - REJECT CAR
========================================================= */

router.put(
  "/admin/:id/reject",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      let car = null;

      if (
        mongoose.Types.ObjectId.isValid(id)
      ) {
        car =
          await Car.findById(id);
      }

      if (
        !car &&
        !Number.isNaN(Number(id))
      ) {
        car =
          await Car.findOne({
            carId: Number(id),
          });
      }

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      car.status =
        "draft";

      await car.save();

      return res.json({
        success: true,
        message:
          "Car rejected successfully",
        car: {
          _id: car._id,
          carId: car.carId,
          status: car.status,
        },
      });
    } catch (error) {
      console.error(
        "REJECT CAR ERROR:",
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

/* =========================================================
   ADMIN - SELLER SEARCH
========================================================= */

router.get(
  "/admin/sellers/search",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const q =
        String(
          req.query.q || ""
        ).trim();

      if (!q) {
        return res.json({
          success: true,
          count: 0,
          sellers: [],
        });
      }

      const regex =
        new RegExp(
          q.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          ),
          "i"
        );

      const sellers =
        await User.find({
          $or: [
            {
              name: regex,
            },
            {
              email: regex,
            },
            {
              phone: regex,
            },
          ],
        })
          .select(
            "_id name email phone role"
          )
          .limit(20)
          .lean();

      return res.json({
        success: true,
        count: sellers.length,
        sellers,
      });
    } catch (error) {
      console.error(
        "SELLER SEARCH ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to search sellers",
      });
    }
  }
);

/* =========================================================
   ADMIN - SELLER CARS
========================================================= */

router.get(
  "/admin/sellers/:sellerId/cars",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const {
        sellerId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          sellerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid seller id",
        });
      }

      const cars =
        await Car.find({
          $or: [
            {
              sellerUser:
                sellerId,
            },
            {
              createdBy:
                sellerId,
            },
          ],
        })
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id title imageUrl brand"
          )
          .populate(
            "variant",
            "_id title imageUrl carModel"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      const preparedCars =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            true
          )
        );

      return res.json({
        success: true,
        count: preparedCars.length,
        cars: preparedCars,
      });
    } catch (error) {
      console.error(
        "SELLER CARS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get seller cars",
      });
    }
  }
);

/* =========================================================
   ADMIN - CHANGE STATUS
========================================================= */

router.put(
  "/admin/:id/status",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

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

      let car = null;

      if (
        mongoose.Types.ObjectId.isValid(id)
      ) {
        car =
          await Car.findById(id);
      }

      if (
        !car &&
        !Number.isNaN(Number(id))
      ) {
        car =
          await Car.findOne({
            carId: Number(id),
          });
      }

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      car.status = status;

      await car.save();

      return res.json({
        success: true,
        message:
          "Car status updated successfully",
        car: {
          _id: car._id,
          carId: car.carId,
          status: car.status,
        },
      });
    } catch (error) {
      console.error(
        "CHANGE CAR STATUS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to change car status",
      });
    }
  }
);

/* =========================================================
   ADMIN - UPDATE SELLER
========================================================= */

router.put(
  "/admin/:id/seller",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        seller,
        sellerUser,
        sellerinfo,
      } = req.body;

      let car = null;

      if (
        mongoose.Types.ObjectId.isValid(id)
      ) {
        car =
          await Car.findById(id);
      }

      if (
        !car &&
        !Number.isNaN(Number(id))
      ) {
        car =
          await Car.findOne({
            carId: Number(id),
          });
      }

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      if (
        seller !== undefined
      ) {
        if (
          seller === null ||
          seller === ""
        ) {
          car.seller = null;
        } else if (
          !String(
            seller
          ).includes(":")
        ) {
          car.seller =
            encryptSeller(
              String(seller)
            );
        } else {
          car.seller =
            seller;
        }
      }

      if (
        sellerUser !== undefined
      ) {
        car.sellerUser =
          sellerUser || null;
      }

      if (
        sellerinfo !== undefined
      ) {
        car.sellerinfo =
          sellerinfo;
      }

      await car.save();

      const updatedCar =
        await Car.findById(
          car._id
        )
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id title imageUrl brand"
          )
          .populate(
            "variant",
            "_id title imageUrl carModel"
          )
          .populate(
            "sellerUser",
            "_id name email phone"
          )
          .lean();

      prepareSellerForResponse(
        updatedCar,
        true
      );

      return res.json({
        success: true,
        message:
          "Seller updated successfully",
        car: updatedCar,
      });
    } catch (error) {
      console.error(
        "UPDATE SELLER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update seller",
      });
    }
  }
);

/* =========================================================
   ADMIN - DRAFT CARS
========================================================= */

router.get(
  "/admin/drafts",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const cars =
        await Car.find({
          status: "draft",
        })
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id title imageUrl brand"
          )
          .populate(
            "variant",
            "_id title imageUrl carModel"
          )
          .populate(
            "createdBy",
            "_id name email phone"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      const preparedCars =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            true
          )
        );

      return res.json({
        success: true,
        count: preparedCars.length,
        cars: preparedCars,
      });
    } catch (error) {
      console.error(
        "GET DRAFT CARS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get draft cars",
      });
    }
  }
);

/* =========================================================
   ADMIN - BOOKING CARS
========================================================= */

router.get(
  "/admin/booking",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const cars =
        await Car.find({
          status: "booking",
        })
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id title imageUrl brand"
          )
          .populate(
            "variant",
            "_id title imageUrl carModel"
          )
          .sort({
            updatedAt: -1,
          })
          .lean();

      const preparedCars =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            true
          )
        );

      return res.json({
        success: true,
        count: preparedCars.length,
        cars: preparedCars,
      });
    } catch (error) {
      console.error(
        "GET BOOKING CARS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get booking cars",
      });
    }
  }
);

/* =========================================================
   ADMIN - SOLD CARS
========================================================= */

router.get(
  "/admin/sold",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const cars =
        await Car.find({
          status: "sold",
        })
          .populate(
            "brand",
            "_id name logoUrl"
          )
          .populate(
            "model",
            "_id title imageUrl brand"
          )
          .populate(
            "variant",
            "_id title imageUrl carModel"
          )
          .sort({
            updatedAt: -1,
          })
          .lean();

      const preparedCars =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            true
          )
        );

      return res.json({
        success: true,
        count: preparedCars.length,
        cars: preparedCars,
      });
    } catch (error) {
      console.error(
        "GET SOLD CARS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get sold cars",
      });
    }
  }
);

/* =========================================================
   HEALTH / ROUTE CHECK
========================================================= */

router.get(
  "/health",
  async (req, res) => {
    return res.json({
      success: true,
      message:
        "Car routes working",
    });
  }
);

/* =========================================================
   EXPORT
========================================================= */

export default router;