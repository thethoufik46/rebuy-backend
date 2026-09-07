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
   These paths match Flutter CarApi exactly.
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
      message: error.message || "Failed to get brands",
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
      message: error.message || "Failed to get models",
    });
  }
});

router.get("/carmodels/brand/:brandId", async (req, res) => {
  try {
    const { brandId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(brandId)) {
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
    console.error("GET MODELS BY BRAND ERROR:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to get models by brand",
    });
  }
});

router.get("/carvariants", async (req, res) => {
  try {
    const variants = await CarVariant.find({})
      .select("_id carModel title imageUrl")
      .sort({ title: 1 })
      .lean();

    return res.json({
      success: true,
      count: variants.length,
      variants,
    });
  } catch (error) {
    console.error("GET VARIANTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get variants",
    });
  }
});

router.get("/carvariants/model/:modelId", async (req, res) => {
  try {
    const { modelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(modelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid model id",
      });
    }

    const variants = await CarVariant.find({
      carModel: modelId,
    })
      .select("_id carModel title imageUrl")
      .sort({ title: 1 })
      .lean();

    return res.json({
      success: true,
      count: variants.length,
      variants,
    });
  } catch (error) {
    console.error("GET VARIANTS BY MODEL ERROR:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to get variants by model",
    });
  }
});

/* Older Flutter compatibility. */
router.get("/carvariants/brand/:brandId", async (req, res) => {
  try {
    const { brandId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(brandId)) {
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

    const modelIds = models.map((item) => item._id);

    const variants = modelIds.length
      ? await CarVariant.find({
          carModel: { $in: modelIds },
        })
          .select("_id carModel title imageUrl")
          .sort({ title: 1 })
          .lean()
      : [];

    return res.json({
      success: true,
      count: variants.length,
      variants,
    });
  } catch (error) {
    console.error("GET VARIANTS BY BRAND ERROR:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to get variants by brand",
    });
  }
});

/* =========================================================
   CREATE CAR - ADMIN
========================================================= */


router.post(
  ["/add", "/admin"],
  verifyToken,
  isAdmin,
  uploadCar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 20 },
    { name: "audio", maxCount: 1 },
    { name: "videos", maxCount: 10 },
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

      const car = await Car.create(carData);

      const responseCar =
        car.toObject();

      prepareSellerForResponse(
        responseCar,
        true
      );

      return res.status(201).json({
        success: true,
        message: "Car created successfully",
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
   GET ALL CARS
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
        filter.insurance = insurance;
      }

      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice !== undefined && minPrice !== "") {
          filter.price.$gte = Number(minPrice);
        }
        if (maxPrice !== undefined && maxPrice !== "") {
          filter.price.$lte = Number(maxPrice);
        }
      }

      if (minYear || maxYear) {
        filter.year = {};
        if (minYear !== undefined && minYear !== "") {
          filter.year.$gte = Number(minYear);
        }
        if (maxYear !== undefined && maxYear !== "") {
          filter.year.$lte = Number(maxYear);
        }
      }

      if (registrationState) {
        filter.registrationState = String(registrationState)
          .trim()
          .toUpperCase();
      }

      if (registrationNumber) {
        filter.registrationNumber = String(registrationNumber).trim();
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
          .select("_id name logoUrl")
          .lean(),

        CarModel.find({
          _id: {
            $in: modelIds,
          },
        })
          .select("_id title imageUrl brand")
          .lean(),

        CarVariant.find({
          _id: {
            $in: variantIds,
          },
        })
          .select("_id title imageUrl carModel")
          .lean(),
      ]);

      const brandMap =
        new Map(
          brands.map((item) => [
            item._id.toString(),
            item,
          ])
        );

      const modelMap =
        new Map(
          models.map((item) => [
            item._id.toString(),
            item,
          ])
        );

      const variantMap =
        new Map(
          variants.map((item) => [
            item._id.toString(),
            item,
          ])
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

/* =========================================================
   GET MY CARS
========================================================= */

router.get(
  "/my",
  verifyToken,
  async (req, res) => {
    try {
      const cars =
        await Car.find({
          $or: [
            {
              createdBy: req.user.id,
            },
            {
              sellerUser: req.user.id,
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

                const responseCars = cars.map((car) => {
        const item = {
          ...car,
        };

        if (
          typeof item.seller === "string" &&
          item.seller.includes(":")
        ) {
          try {
            item.seller = decryptSeller(
              item.seller
            );
          } catch (_) {}
        }

        return item;
      });

      return res.json({
        success: true,
        count: responseCars.length,
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

/* =========================================================
   GET USER CARS
========================================================= */

router.get(
  "/my-cars",
  verifyToken,
  async (req, res) => {
    try {
      const cars =
        await Car.find({
          $or: [
            {
              createdBy: req.user.id,
            },
            {
              sellerUser: req.user.id,
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

      const result = cars.map((car) =>
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

/* =========================================================
   CREATE CAR - USER
========================================================= */

router.post(
  ["/user-add", "/"],
  verifyToken,
  uploadCar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "audio", maxCount: 1 },
    { name: "videos", maxCount: 3 },
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
        variant:
          variant || null,

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
          sellerUser ||
          req.user.id,

        sellerinfo,

        district,

        city:
          city || null,

        description:
          description || null,

        createdBy:
          req.user.id,
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
          car.status === "delete_requested"
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

/* =========================================================
   UPDATE CAR
========================================================= */

router.put(
  "/:id",
  verifyToken,
  uploadCar.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 20 },
    { name: "audio", maxCount: 1 },
    { name: "videos", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
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

      const nextBrand =
        brand || car.brand;

      const nextModel =
        model || car.model;

      const nextVariant =
        variant === undefined
          ? car.variant
          : variant || null;

      await validateCarHierarchy(
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
        updateData.seller !== undefined
      ) {
        updateData.seller =
          updateData.seller
            ? encryptSeller(
                updateData.seller
              )
            : null;
      }

      if (
        req.body.csrKm === ""
      ) {
        updateData.csrKm = null;
      }

      if (
        req.body.serviceRecord === ""
      ) {
        updateData.serviceRecord =
          null;
      }

      if (
        req.body.insurance === ""
      ) {
        updateData.insurance =
          null;
      }

      if (
        req.body.stig === ""
      ) {
        updateData.stig = null;
      }

      if (
        req.body.city === ""
      ) {
        updateData.city = null;
      }

      if (
        req.body.description === ""
      ) {
        updateData.description =
          null;
      }

      if (
        req.files &&
        req.files.banner &&
        req.files.banner[0]
      ) {
        updateData.bannerImage =
          req.files.banner[0].path;
      }

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
            ? car.galleryImages
            : [];
      }

      if (
        req.files &&
        req.files.gallery
      ) {
        updateData.galleryImages = [
          ...existingGallery,
          ...req.files.gallery.map(
            (file) => file.path
          ),
        ];
      } else {
        updateData.galleryImages =
          existingGallery;
      }

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
          Array.isArray(car.videos)
            ? car.videos
            : [];
      }

      if (
        req.files &&
        req.files.videos
      ) {
        updateData.videos = [
          ...existingVideos,
          ...req.files.videos.map(
            (file) => file.path
          ),
        ];
      } else {
        updateData.videos =
          existingVideos;
      }

      if (
        req.files &&
        req.files.audio &&
        req.files.audio[0]
      ) {
        updateData.audioNote =
          req.files.audio[0].path;
      }

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


/* =========================================================
   ADMIN - GET ALL CARS
========================================================= */

router.get(
  "/admin/all",
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
        filter.insurance = insurance;
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
          brands.map((item) => [
            item._id.toString(),
            item,
          ])
        );

      const modelMap =
        new Map(
          models.map((item) => [
            item._id.toString(),
            item,
          ])
        );

      const variantMap =
        new Map(
          variants.map((item) => [
            item._id.toString(),
            item,
          ])
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

          /*
           * ADMIN ONLY
           * Seller is decrypted and returned.
           */
          prepareSellerForResponse(
            car,
            true
          );

          return car;
        });

      return res.json({
        success: true,
        count: result.length,
        cars: result,
      });
    } catch (error) {
      console.error(
        "Admin get all cars error:",
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
   ADMIN - GET SINGLE CAR
========================================================= */

router.get(
  "/admin/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
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
          message: "Car not found",
        });
      }

      /*
       * ADMIN ONLY
       * Seller is available here.
       */
      prepareSellerForResponse(
        car,
        true
      );

      return res.json({
        success: true,
        car,
      });
    } catch (error) {
      console.error(
        "Admin get car error:",
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
   ADMIN - UPDATE CAR STATUS
========================================================= */

router.patch(
  "/admin/:id/status",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = [
        "available",
        "booking",
        "sold",
        "draft",
        "delete_requested",
      ];

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid car id",
        });
      }

      if (
        !allowedStatuses.includes(status)
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
          message: "Car not found",
        });
      }

      car.status = status;

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

      prepareSellerForResponse(
        responseCar,
        true
      );

      return res.json({
        success: true,
        message:
          "Car status updated successfully",
        car: responseCar,
      });
    } catch (error) {
      console.error(
        "Admin status update error:",
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

/* =========================================================
   ADMIN - DELETE CAR
========================================================= */

router.delete(
  "/admin/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
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

      await Car.findByIdAndDelete(id);

      return res.json({
        success: true,
        message:
          "Car deleted successfully",
      });
    } catch (error) {
      console.error(
        "Admin delete car error:",
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
   ADMIN - APPROVE CAR
========================================================= */

router.patch(
  "/admin/:id/approve",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
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

      car.status = "available";

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

      prepareSellerForResponse(
        responseCar,
        true
      );

      return res.json({
        success: true,
        message:
          "Car approved successfully",
        car: responseCar,
      });
    } catch (error) {
      console.error(
        "Approve car error:",
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
   ADMIN - REJECT / DRAFT CAR
========================================================= */

router.patch(
  "/admin/:id/reject",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
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

      car.status = "draft";

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

      prepareSellerForResponse(
        responseCar,
        true
      );

      return res.json({
        success: true,
        message:
          "Car moved to draft successfully",
        car: responseCar,
      });
    } catch (error) {
      console.error(
        "Reject car error:",
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
   BRAND LIST
========================================================= */

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
        "Get brands error:",
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

/* =========================================================
   MODEL LIST BY BRAND
========================================================= */

router.get(
  "/meta/models",
  async (req, res) => {
    try {
      const { brand } =
        req.query;

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
        "Get models error:",
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

/* =========================================================
   VARIANT LIST BY MODEL
========================================================= */

router.get(
  "/meta/variants",
  async (req, res) => {
    try {
      const { model } =
        req.query;

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
        "Get variants error:",
        error
      );

          }
  }
);

/* =========================================================
   END OF CAR ROUTES
========================================================= */

export default router;