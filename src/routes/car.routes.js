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
   CREATE CAR - ADMIN
========================================================= */

router.post(
  "/admin",
  verifyToken,
  isAdmin,
  uploadCar.fields([
    { name: "bannerImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 20 },
    { name: "audioNote", maxCount: 1 },
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
        req.files.bannerImage &&
        req.files.bannerImage[0]
      ) {
        carData.bannerImage =
          req.files.bannerImage[0].path;
      }

      if (
        req.files &&
        req.files.galleryImages
      ) {
        carData.galleryImages =
          req.files.galleryImages.map(
            (file) => file.path
          );
      }

      if (
        req.files &&
        req.files.audioNote &&
        req.files.audioNote[0]
      ) {
        carData.audioNote =
          req.files.audioNote[0].path;
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
          .sort({
            createdAt: -1,
          })
          .lean();

      const isAdminUser =
        req.user.role === "admin";

      const result =
        cars.map((car) =>
          prepareSellerForResponse(
            car,
            isAdminUser
          )
        );

      return res.json({
        success: true,
        count: result.length,
        cars: result,
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

      const car = await Car.findById(id)
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

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      const isAdminUser =
        !!req.user &&
        req.user.role === "admin";

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
        "Get car by id error:",
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
   USER CREATE CAR
========================================================= */

router.post(
  "/",
  verifyToken,
  uploadCar.fields([
    {
      name: "bannerImage",
      maxCount: 1,
    },
    {
      name: "galleryImages",
      maxCount: 20,
    },
    {
      name: "audioNote",
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

        seller,
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

        status: "draft",

        seller:
          seller
            ? encryptSeller(seller)
            : undefined,

        sellerUser: req.user.id,

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
        req.files.bannerImage &&
        req.files.bannerImage[0]
      ) {
        carData.bannerImage =
          req.files.bannerImage[0].path;
      }

      if (
        req.files &&
        req.files.galleryImages
      ) {
        carData.galleryImages =
          req.files.galleryImages.map(
            (file) => file.path
          );
      }

      if (
        req.files &&
        req.files.audioNote &&
        req.files.audioNote[0]
      ) {
        carData.audioNote =
          req.files.audioNote[0].path;
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

      // Seller must be ADMIN only.
      prepareSellerForResponse(
        responseCar,
        true
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
   UPDATE CAR
========================================================= */

router.put(
  "/:id",
  verifyToken,
  uploadCar.fields([
    {
      name: "bannerImage",
      maxCount: 1,
    },
    {
      name: "galleryImages",
      maxCount: 20,
    },
    {
      name: "audioNote",
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
            "You are not authorized to update this car",
        });
      }

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

        "seller",
        "sellerUser",
        "sellerinfo",

        "district",
        "city",
        "description",

        "videoLink",
      ];

      for (
        const field of allowedFields
      ) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          car[field] =
            req.body[field];
        }
      }

      /*
       * BRAND → MODEL → VARIANT
       * Always validate the final values
       * before saving.
       */
      const finalBrand =
        car.brand;

      const finalModel =
        car.model;

      const finalVariant =
        car.variant || null;

      await validateCarHierarchy(
        finalBrand,
        finalModel,
        finalVariant
      );

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "seller"
        )
      ) {
        if (
          req.body.seller &&
          typeof req.body.seller ===
            "string"
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

      if (
        req.files &&
        req.files.bannerImage &&
        req.files.bannerImage[0]
      ) {
        car.bannerImage =
          req.files.bannerImage[0].path;
      }

      if (
        req.files &&
        req.files.galleryImages
      ) {
        car.galleryImages =
          req.files.galleryImages.map(
            (file) => file.path
          );
      }

      if (
        req.files &&
        req.files.audioNote &&
        req.files.audioNote[0]
      ) {
        car.audioNote =
          req.files.audioNote[0].path;
      }

      if (
        req.files &&
        req.files.videos
      ) {
        car.videos =
          req.files.videos.map(
            (file) => file.path
          );
      }

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
        isAdminUser
      );

      return res.json({
        success: true,
        message:
          "Car updated successfully",
        car: responseCar,
      });
    } catch (error) {
      console.error(
        "Update car error:",
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
   DELETE / REQUEST DELETE
========================================================= */

router.delete(
  "/:id",
  verifyToken,
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
            "You are not authorized to delete this car",
        });
      }

      if (isAdminUser) {
        await Car.findByIdAndDelete(id);

        return res.json({
          success: true,
          message:
            "Car deleted successfully",
        });
      }

      car.status =
        "delete_requested";

      await car.save();

      return res.json({
        success: true,
        message:
          "Car delete request submitted",
        car,
      });
    } catch (error) {
      console.error(
        "Delete car error:",
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

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get variants",
      });
    }
  }
);


/* =========================================================
   PART 4/4
   COMMON ROUTES + EXPORT
========================================================= */

/* =========================================================
   ADMIN - UPDATE SELLER
========================================================= */

router.patch(
  "/admin/:id/seller",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { seller, sellerUser, sellerinfo } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid car id",
        });
      }

      const car = await Car.findById(id);

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      if (seller !== undefined) {
        car.seller =
          seller === null || seller === ""
            ? null
            : encryptSeller(String(seller));
      }

      if (sellerUser !== undefined) {
        if (
          sellerUser !== null &&
          sellerUser !== "" &&
          !mongoose.Types.ObjectId.isValid(
            sellerUser
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid seller user id",
          });
        }

        car.sellerUser =
          sellerUser || null;
      }

      if (sellerinfo !== undefined) {
        car.sellerinfo =
          sellerinfo;
      }

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
          .populate(
            "sellerUser",
            "-password"
          )
          .lean();

      prepareSellerForResponse(
        responseCar,
        true
      );

      return res.json({
        success: true,
        message:
          "Seller updated successfully",
        car: responseCar,
      });
    } catch (error) {
      console.error(
        "Admin seller update error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to update seller",
      });
    }
  }
);

/* =========================================================
   ADMIN - GET PENDING / DRAFT CARS
========================================================= */

router.get(
  "/admin/pending",
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
          .sort({
            createdAt: -1,
          })
          .lean();

      cars.forEach((car) => {
        prepareSellerForResponse(
          car,
          true
        );
      });

      return res.json({
        success: true,
        count: cars.length,
        cars,
      });
    } catch (error) {
      console.error(
        "Admin pending cars error:",
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
   ADMIN - GET DELETE REQUESTS
========================================================= */

router.get(
  "/admin/delete-requests",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const cars =
        await Car.find({
          status: "delete_requested",
        })
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
          .sort({
            createdAt: -1,
          })
          .lean();

      cars.forEach((car) => {
        prepareSellerForResponse(
          car,
          true
        );
      });

      return res.json({
        success: true,
        count: cars.length,
        cars,
      });
    } catch (error) {
      console.error(
        "Admin delete requests error:",
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

router.patch(
  "/admin/:id/approve-delete",
  verifyToken,
  isAdmin,
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

      await Car.findByIdAndDelete(id);

      return res.json({
        success: true,
        message:
          "Delete request approved and car deleted",
      });
    } catch (error) {
      console.error(
        "Approve delete error:",
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
   ADMIN - CANCEL DELETE REQUEST
========================================================= */

router.patch(
  "/admin/:id/cancel-delete",
  verifyToken,
  isAdmin,
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
          "Delete request cancelled",
        car: responseCar,
      });
    } catch (error) {
      console.error(
        "Cancel delete error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to cancel delete request",
      });
    }
  }
);

/* =========================================================
   ADMIN - GET CAR COUNTS
========================================================= */

router.get(
  "/admin/stats/counts",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const [
        total,
        available,
        booking,
        sold,
        draft,
        deleteRequested,
      ] = await Promise.all([
        Car.countDocuments({}),

        Car.countDocuments({
          status: "available",
        }),

        Car.countDocuments({
          status: "booking",
        }),

        Car.countDocuments({
          status: "sold",
        }),

        Car.countDocuments({
          status: "draft",
        }),

        Car.countDocuments({
          status: "delete_requested",
        }),
      ]);

      return res.json({
        success: true,
        counts: {
          total,
          available,
          booking,
          sold,
          draft,
          deleteRequested,
        },
      });
    } catch (error) {
      console.error(
        "Car stats error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get car counts",
      });
    }
  }
);

/* =========================================================
   ADMIN - SEARCH SELLER
========================================================= */

router.get(
  "/admin/sellers/search",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || !String(q).trim()) {
        return res.json({
          success: true,
          sellers: [],
        });
      }

      const users =
        await User.find({
          $or: [
            {
              name: {
                $regex: q,
                $options: "i",
              },
            },
            {
              email: {
                $regex: q,
                $options: "i",
              },
            },
            {
              phone: {
                $regex: q,
                $options: "i",
              },
            },
          ],
        })
          .select("-password")
          .limit(20)
          .lean();

      return res.json({
        success: true,
        count: users.length,
        sellers: users,
      });
    } catch (error) {
      console.error(
        "Seller search error:",
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
   ADMIN - GET CARS BY SELLER USER
========================================================= */

router.get(
  "/admin/seller/:sellerUserId",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const {
        sellerUserId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          sellerUserId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid seller user id",
        });
      }

      const cars =
        await Car.find({
          sellerUser: sellerUserId,
        })
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
          .sort({
            createdAt: -1,
          })
          .lean();

      cars.forEach((car) => {
        prepareSellerForResponse(
          car,
          true
        );
      });

      return res.json({
        success: true,
        count: cars.length,
        cars,
      });
    } catch (error) {
      console.error(
        "Cars by seller error:",
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
   BRAND → MODEL VALIDATION
========================================================= */

router.get(
  "/meta/validate-hierarchy",
  async (req, res) => {
    try {
      const {
        brand,
        model,
        variant,
      } = req.query;

      if (!brand || !model) {
        return res.status(400).json({
          success: false,
          message:
            "Brand and model are required",
        });
      }

      await validateCarHierarchy(
        brand,
        model,
        variant || null
      );

      return res.json({
        success: true,
        valid: true,
        message:
          "Brand, model and variant hierarchy is valid",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        valid: false,
        message:
          error.message ||
          "Invalid hierarchy",
      });
    }
  }
);

/* =========================================================
   EXPORT
========================================================= */

export default router;