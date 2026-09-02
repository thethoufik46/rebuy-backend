// ======================= car.model.controller.js =======================

import CarModel from "../../../models/car/model/car_model_model.js";
import CarBrand from "../../../models/car/brand/car_brand_model.js";

import {
  uploadCarModelImage,
  deleteCarModelImage,
} from "../../../utils/car/model/carModel.js";

// ============================================================
// ADD CAR MODEL
// ============================================================

export const addCarModel = async (
  req,
  res
) => {
  try {
    const {
      brandId,
      title,
    } = req.body;

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (
      !brandId ||
      !title ||
      !req.file
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Brand, car model title and image are required",
      });
    }

    // ----------------------------------------------------------
    // CHECK BRAND
    // ----------------------------------------------------------

    const brand =
      await CarBrand.findById(
        brandId
      );

    if (!brand) {
      return res.status(404).json({
        success: false,
        message:
          "Brand not found",
      });
    }

    // ----------------------------------------------------------
    // CHECK DUPLICATE
    // ----------------------------------------------------------

    const existing =
      await CarModel.findOne({
        brand: brandId,

        title: new RegExp(
          `^${title.trim()}$`,
          "i"
        ),
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Car model already exists",
      });
    }

    // ----------------------------------------------------------
    // UPLOAD IMAGE
    // ----------------------------------------------------------

    const imageUrl =
      await uploadCarModelImage(
        req.file
      );

    // ----------------------------------------------------------
    // CREATE CAR MODEL
    // ----------------------------------------------------------

    const carModel =
      await CarModel.create({
        brand: brandId,
        title: title.trim(),
        imageUrl,
      });

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,
      carModel,
    });
  } catch (err) {
    console.error(
      "ADD CAR MODEL ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================================================
// GET ALL CAR MODELS
// ============================================================

export const getAllCarModels = async (
  req,
  res
) => {
  try {
    const carModels =
      await CarModel.find()
        .sort({
          createdAt: -1,
        })
        .populate(
          "brand",
          "name logoUrl"
        );

    const data =
      carModels.map(
        (model) => ({
          _id:
            model._id.toString(),

          brandId:
            model.brand?._id
              ?.toString() ||
            "",

          brandName:
            model.brand?.name ||
            "",

          brandLogo:
            model.brand?.logoUrl ||
            "",

          modelName:
            model.title ||
            "",

          modelImage:
            model.imageUrl ||
            "",
        })
      );

    return res.status(200).json({
      success: true,
      carModels: data,
    });
  } catch (err) {
    console.error(
      "GET ALL CAR MODELS ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================================================
// GET CAR MODELS BY BRAND
// ============================================================

export const getCarModelsByBrand =
  async (
    req,
    res
  ) => {
    try {
      const {
        brandId,
      } = req.params;

      // --------------------------------------------------------
      // CHECK BRAND
      // --------------------------------------------------------

      const brand =
        await CarBrand.findById(
          brandId
        );

      if (!brand) {
        return res.status(404).json({
          success: false,
          message:
            "Brand not found",
        });
      }

      // --------------------------------------------------------
      // GET MODELS
      // --------------------------------------------------------

      const carModels =
        await CarModel.find({
          brand: brandId,
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "brand",
            "name logoUrl"
          );

      // --------------------------------------------------------
      // PRIORITY
      // --------------------------------------------------------

      const priority = [
        "crysta",
        "innova",
        "ertiga",
        "swift",
        "wagon r",
      ];

      carModels.sort(
        (a, b) => {
          const aTitle =
            (a.title || "")
              .trim()
              .toLowerCase();

          const bTitle =
            (b.title || "")
              .trim()
              .toLowerCase();

          const aIndex =
            priority.findIndex(
              (item) =>
                aTitle.startsWith(
                  item
                )
            );

          const bIndex =
            priority.findIndex(
              (item) =>
                bTitle.startsWith(
                  item
                )
            );

          if (
            aIndex !== -1 &&
            bIndex !== -1
          ) {
            return (
              aIndex - bIndex
            );
          }

          if (
            aIndex !== -1
          ) {
            return -1;
          }

          if (
            bIndex !== -1
          ) {
            return 1;
          }

          return aTitle.localeCompare(
            bTitle,
            "en",
            {
              sensitivity:
                "base",
            }
          );
        }
      );

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      const data =
        carModels.map(
          (model) => ({
            _id:
              model._id.toString(),

            brandId:
              model.brand?._id
                ?.toString() ||
              "",

            brandName:
              model.brand?.name ||
              "",

            brandLogo:
              model.brand?.logoUrl ||
              "",

            modelName:
              model.title ||
              "",

            modelImage:
              model.imageUrl ||
              "",
          })
        );

      return res.status(200).json({
        success: true,
        carModels: data,
      });
    } catch (err) {
      console.error(
        "GET CAR MODELS BY BRAND ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ============================================================
// GET VISIBLE CAR MODELS
// HIDE LOAD VEHICLES + OTHER STATE
// ============================================================

export const getONEBrandhideCarModels =
  async (
    req,
    res
  ) => {
    try {
      // --------------------------------------------------------
      // LOAD VEHICLES BRAND
      // --------------------------------------------------------

      const loadBrand =
        await CarBrand.findOne({
          name:
            "Load vehicles லோடு வாகனங்கள்",
        });

      // --------------------------------------------------------
      // OTHER STATE BRAND
      // --------------------------------------------------------

      const otherStateBrand =
        await CarBrand.findOne({
          name:
            "Other State டெல்லி",
        });

      // --------------------------------------------------------
      // HIDDEN IDS
      // --------------------------------------------------------

      const hiddenBrandIds = [];

      if (loadBrand) {
        hiddenBrandIds.push(
          loadBrand._id
        );
      }

      if (otherStateBrand) {
        hiddenBrandIds.push(
          otherStateBrand._id
        );
      }

      // --------------------------------------------------------
      // QUERY
      // --------------------------------------------------------

      const query =
        hiddenBrandIds.length > 0
          ? {
              brand: {
                $nin:
                  hiddenBrandIds,
              },
            }
          : {};

      // --------------------------------------------------------
      // GET MODELS
      // --------------------------------------------------------

      const carModels =
        await CarModel.find(query)
          .sort({
            createdAt: -1,
          })
          .populate(
            "brand",
            "name logoUrl"
          );

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      const data =
        carModels.map(
          (model) => ({
            _id:
              model._id.toString(),

            brandId:
              model.brand?._id
                ?.toString() ||
              "",

            brandName:
              model.brand?.name ||
              "",

            brandLogo:
              model.brand?.logoUrl ||
              "",

            modelName:
              model.title ||
              "",

            modelImage:
              model.imageUrl ||
              "",
          })
        );

      return res.status(200).json({
        success: true,
        carModels: data,
      });
    } catch (err) {
      console.error(
        "GET VISIBLE CAR MODELS ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ============================================================
// LOAD VEHICLES CAR MODELS
// ============================================================

export const getLoadVehiclesCarModels =
  async (
    req,
    res
  ) => {
    try {
      const brand =
        await CarBrand.findOne({
          name: /load vehicles/i,
        });

      if (!brand) {
        return res.status(200).json({
          success: true,
          carModels: [],
        });
      }

      const carModels =
        await CarModel.find({
          brand:
            brand._id,
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "brand",
            "name logoUrl"
          );

      const data =
        carModels.map(
          (model) => ({
            _id:
              model._id.toString(),

            brandId:
              model.brand?._id
                ?.toString() ||
              "",

            brandName:
              model.brand?.name ||
              "",

            brandLogo:
              model.brand?.logoUrl ||
              "",

            modelName:
              model.title ||
              "",

            modelImage:
              model.imageUrl ||
              "",
          })
        );

      return res.status(200).json({
        success: true,
        carModels: data,
      });
    } catch (err) {
      console.error(
        "GET LOAD VEHICLES CAR MODELS ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ============================================================
// OTHER STATE CAR MODELS
// ============================================================

export const getOtherStateCarModels =
  async (
    req,
    res
  ) => {
    try {
      const brand =
        await CarBrand.findOne({
          name:
            "Other State டெல்லி",
        });

      if (!brand) {
        return res.status(200).json({
          success: true,
          carModels: [],
        });
      }

      const carModels =
        await CarModel.find({
          brand:
            brand._id,
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "brand",
            "name logoUrl"
          );

      const data =
        carModels.map(
          (model) => ({
            _id:
              model._id.toString(),

            brandId:
              model.brand?._id
                ?.toString() ||
              "",

            brandName:
              model.brand?.name ||
              "",

            brandLogo:
              model.brand?.logoUrl ||
              "",

            modelName:
              model.title ||
              "",

            modelImage:
              model.imageUrl ||
              "",
          })
        );

      return res.status(200).json({
        success: true,
        carModels: data,
      });
    } catch (err) {
      console.error(
        "GET OTHER STATE CAR MODELS ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ============================================================
// SELECTED CAR MODELS
// ============================================================

export const getSelectedCarModels =
  async (
    req,
    res
  ) => {
    try {
      const carModels =
        await CarModel.find({
          title: {
            $in: [
              "Innova இன்னோவா",
              "Crysta கிரிஸ்டா",
              "Swift ஸ்விப்ட்",
              "Ertiga எர்டிகா",
            ],
          },
        })
          .populate(
            "brand",
            "name logoUrl"
          )
          .sort({
            createdAt: -1,
          });

      const data =
        carModels.map(
          (model) => ({
            _id:
              model._id.toString(),

            brandId:
              model.brand?._id
                ?.toString() ||
              "",

            brandName:
              model.brand?.name ||
              "",

            brandLogo:
              model.brand?.logoUrl ||
              "",

            modelName:
              model.title ||
              "",

            modelImage:
              model.imageUrl ||
              "",
          })
        );

      return res.status(200).json({
        success: true,
        carModels: data,
      });
    } catch (err) {
      console.error(
        "GET SELECTED CAR MODELS ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ============================================================
// UPDATE CAR MODEL
// ============================================================

export const updateCarModel =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const {
        title,
        brandId,
      } = req.body;

      // --------------------------------------------------------
      // FIND MODEL
      // --------------------------------------------------------

      const carModel =
        await CarModel.findById(
          id
        );

      if (!carModel) {
        return res.status(404).json({
          success: false,
          message:
            "Car model not found",
        });
      }

      // --------------------------------------------------------
      // UPDATE TITLE
      // --------------------------------------------------------

      if (
        title &&
        title.trim()
      ) {
        carModel.title =
          title.trim();
      }

      // --------------------------------------------------------
      // UPDATE BRAND
      // --------------------------------------------------------

      if (brandId) {
        const brand =
          await CarBrand.findById(
            brandId
          );

        if (!brand) {
          return res.status(404).json({
            success: false,
            message:
              "Brand not found",
          });
        }

        carModel.brand =
          brandId;
      }

      // --------------------------------------------------------
      // UPDATE IMAGE
      // --------------------------------------------------------

      if (req.file) {
        await deleteCarModelImage(
          carModel.imageUrl
        );

        carModel.imageUrl =
          await uploadCarModelImage(
            req.file
          );
      }

      // --------------------------------------------------------
      // SAVE
      // --------------------------------------------------------

      await carModel.save();

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        carModel,
      });
    } catch (err) {
      console.error(
        "UPDATE CAR MODEL ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

// ============================================================
// DELETE CAR MODEL
// ============================================================

export const deleteCarModel =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      // --------------------------------------------------------
      // FIND MODEL
      // --------------------------------------------------------

      const carModel =
        await CarModel.findById(
          id
        );

      if (!carModel) {
        return res.status(404).json({
          success: false,
          message:
            "Car model not found",
        });
      }

      // --------------------------------------------------------
      // DELETE R2 IMAGE
      // --------------------------------------------------------

      await deleteCarModelImage(
        carModel.imageUrl
      );

      // --------------------------------------------------------
      // DELETE DATABASE
      // --------------------------------------------------------

      await carModel.deleteOne();

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Car model deleted",
      });
    } catch (err) {
      console.error(
        "DELETE CAR MODEL ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };