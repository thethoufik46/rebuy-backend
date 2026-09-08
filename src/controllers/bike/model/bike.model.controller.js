// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import BikeModel from "../../../models/bike/model/bike_model_model.js";
import BikeBrand from "../../../models/bike/brand/bike_brand_model.js";
import {
  uploadBikeModelImage,
  deleteBikeModelImage,
} from "../../../utils/bike/model/bikeModel.js";
export const addBikeModel = async (
  req,
  res
) => {
  try {
    const {
      brandId,
      title,
    } = req.body;
    if (
      !brandId ||
      !title ||
      !title.trim() ||
      !req.file
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Brand, bike model title and image are required",
      });
    }
    const brand =
      await BikeBrand.findById(
        brandId
      );
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }
    const cleanTitle = title.trim();
    const existing =
      await BikeModel.findOne({
        brand: brandId,
        title: new RegExp(
          `^${cleanTitle.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}$`,
          "i"
        ),
      });
    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Bike model already exists",
      });
    }
    const imageUrl =
      await uploadBikeModelImage(
        req.file
      );
    const bikeModel =
      await BikeModel.create({
        brand: brandId,
        title: cleanTitle,
        imageUrl,
      });
    return res.status(201).json({
      success: true,
      bikeModel,
    });
  } catch (err) {
    console.error(
      "ADD BIKE MODEL ERROR 👉",
      err
    );
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const getAllBikeModels =
  async (
    req,
    res
  ) => {
    try {
      const bikeModels =
        await BikeModel.find()
          .sort({
            createdAt: -1,
          })
          .populate(
            "brand",
            "name logoUrl"
          );
      const data =
        bikeModels.map(
          (model) => ({
            _id:
              model._id.toString(),
            brandId:
              model.brand?._id
                ?.toString() || "",
            brandName:
              model.brand?.name || "",
            brandLogo:
              model.brand?.logoUrl || "",
            modelName:
              model.title || "",
            modelImage:
              model.imageUrl || "",
          })
        );
      return res.status(200).json({
        success: true,
        bikeModels: data,
      });
    } catch (err) {
      console.error(
        "GET ALL BIKE MODELS ERROR 👉",
        err
      );
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
export const getBikeModelsByBrand =
  async (
    req,
    res
  ) => {
    try {
      const {
        brandId,
      } = req.params;
      const brand =
        await BikeBrand.findById(
          brandId
        );
      if (!brand) {
        return res.status(404).json({
          success: false,
          message:
            "Brand not found",
        });
      }
      const bikeModels =
        await BikeModel.find({
          brand: brandId,
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "brand",
            "name logoUrl"
          );
      const data =
        bikeModels.map(
          (model) => ({
            _id:
              model._id.toString(),
            brandId:
              model.brand?._id
                ?.toString() || "",
            brandName:
              model.brand?.name || "",
            brandLogo:
              model.brand?.logoUrl || "",
            modelName:
              model.title || "",
            modelImage:
              model.imageUrl || "",
          })
        );
      return res.status(200).json({
        success: true,
        bikeModels: data,
      });
    } catch (err) {
      console.error(
        "GET BIKE MODELS BY BRAND ERROR 👉",
        err
      );
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
export const getONEBrandhideBikeModels =
  async (
    req,
    res
  ) => {
    try {
      const hiddenNames = [
        "Load vehicles",
        "Other State",
      ];
      const hiddenBrands =
        await BikeBrand.find({
          name: {
            $in: hiddenNames,
          },
        });
      const hiddenBrandIds =
        hiddenBrands.map(
          (brand) => brand._id
        );
      const query =
        hiddenBrandIds.length > 0
          ? {
              brand: {
                $nin:
                  hiddenBrandIds,
              },
            }
          : {};
      const bikeModels =
        await BikeModel.find(query)
          .sort({
            createdAt: -1,
          })
          .populate(
            "brand",
            "name logoUrl"
          );
      const data =
        bikeModels.map(
          (model) => ({
            _id:
              model._id.toString(),
            brandId:
              model.brand?._id
                ?.toString() || "",
            brandName:
              model.brand?.name || "",
            brandLogo:
              model.brand?.logoUrl || "",
            modelName:
              model.title || "",
            modelImage:
              model.imageUrl || "",
          })
        );
      return res.status(200).json({
        success: true,
        bikeModels: data,
      });
    } catch (err) {
      console.error(
        "GET VISIBLE BIKE MODELS ERROR 👉",
        err
      );
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
export const getLoadVehiclesBikeModels =
  async (
    req,
    res
  ) => {
    try {
      const brand =
        await BikeBrand.findOne({
          name: /load vehicles/i,
        });
      if (!brand) {
        return res.status(200).json({
          success: true,
          bikeModels: [],
        });
      }
      const bikeModels =
        await BikeModel.find({
          brand: brand._id,
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "brand",
            "name logoUrl"
          );
      const data =
        bikeModels.map(
          (model) => ({
            _id:
              model._id.toString(),
            brandId:
              model.brand?._id
                ?.toString() || "",
            brandName:
              model.brand?.name || "",
            brandLogo:
              model.brand?.logoUrl || "",
            modelName:
              model.title || "",
            modelImage:
              model.imageUrl || "",
          })
        );
      return res.status(200).json({
        success: true,
        bikeModels: data,
      });
    } catch (err) {
      console.error(
        "GET LOAD VEHICLES BIKE MODELS ERROR 👉",
        err
      );
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
export const getOtherStateBikeModels =
  async (
    req,
    res
  ) => {
    try {
      const brand =
        await BikeBrand.findOne({
          name: /other state/i,
        });
      if (!brand) {
        return res.status(200).json({
          success: true,
          bikeModels: [],
        });
      }
      const bikeModels =
        await BikeModel.find({
          brand: brand._id,
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "brand",
            "name logoUrl"
          );
      const data =
        bikeModels.map(
          (model) => ({
            _id:
              model._id.toString(),
            brandId:
              model.brand?._id
                ?.toString() || "",
            brandName:
              model.brand?.name || "",
            brandLogo:
              model.brand?.logoUrl || "",
            modelName:
              model.title || "",
            modelImage:
              model.imageUrl || "",
          })
        );
      return res.status(200).json({
        success: true,
        bikeModels: data,
      });
    } catch (err) {
      console.error(
        "GET OTHER STATE BIKE MODELS ERROR 👉",
        err
      );
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
export const getSelectedBikeModels =
  async (
    req,
    res
  ) => {
    try {
      const bikeModels =
        await BikeModel.find({
          title: {
            $in: [],
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
        bikeModels.map(
          (model) => ({
            _id:
              model._id.toString(),
            brandId:
              model.brand?._id
                ?.toString() || "",
            brandName:
              model.brand?.name || "",
            brandLogo:
              model.brand?.logoUrl || "",
            modelName:
              model.title || "",
            modelImage:
              model.imageUrl || "",
          })
        );
      return res.status(200).json({
        success: true,
        bikeModels: data,
      });
    } catch (err) {
      console.error(
        "GET SELECTED BIKE MODELS ERROR 👉",
        err
      );
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
export const updateBikeModel =
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
      const bikeModel =
        await BikeModel.findById(
          id
        );
      if (!bikeModel) {
        return res.status(404).json({
          success: false,
          message:
            "Bike model not found",
        });
      }
      if (
        title &&
        title.trim()
      ) {
        bikeModel.title =
          title.trim();
      }
      if (brandId) {
        const brand =
          await BikeBrand.findById(
            brandId
          );
        if (!brand) {
          return res.status(404).json({
            success: false,
            message:
              "Brand not found",
          });
        }
        bikeModel.brand =
          brandId;
      }
      if (req.file) {
        await deleteBikeModelImage(
          bikeModel.imageUrl
        );
        bikeModel.imageUrl =
          await uploadBikeModelImage(
            req.file
          );
      }
      await bikeModel.save();
      return res.status(200).json({
        success: true,
        bikeModel,
      });
    } catch (err) {
      console.error(
        "UPDATE BIKE MODEL ERROR 👉",
        err
      );
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
export const deleteBikeModel =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;
      const bikeModel =
        await BikeModel.findById(
          id
        );
      if (!bikeModel) {
        return res.status(404).json({
          success: false,
          message:
            "Bike model not found",
        });
      }
      await deleteBikeModelImage(
        bikeModel.imageUrl
      );
      await bikeModel.deleteOne();
      return res.status(200).json({
        success: true,
        message:
          "Bike model deleted",
      });
    } catch (err) {
      console.error(
        "DELETE BIKE MODEL ERROR 👉",
        err
      );
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };