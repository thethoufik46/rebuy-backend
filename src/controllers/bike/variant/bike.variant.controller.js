// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import BikeVariant from "../../../models/bike/variant/bike_variant_model.js";
import BikeModel from "../../../models/bike/model/bike_model_model.js";
import {
  uploadBikeVariantImage,
  deleteBikeVariantImage,
} from "../../../utils/bike/variant/bikeVariant.js";
export const addBikeVariant = async (
  req,
  res
) => {
  try {
    const {
      modelId,
      title,
    } = req.body;
    if (
      !modelId ||
      !title ||
      !req.file
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Model, bike variant title and image are required",
      });
    }
    const model =
      await BikeModel.findById(
        modelId
      );
    if (!model) {
      return res.status(404).json({
        success: false,
        message: "Model not found",
      });
    }
    const cleanTitle =
      title.trim();
    const existing =
      await BikeVariant.findOne({
        model: modelId,
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
          "Bike variant already exists",
      });
    }
    const imageUrl =
      await uploadBikeVariantImage(
        req.file
      );
    const bikeVariant =
      await BikeVariant.create({
        model: modelId,
        title: cleanTitle,
        imageUrl,
      });
    return res.status(201).json({
      success: true,
      bikeVariant,
    });
  } catch (err) {
    console.error(
      "ADD BIKE VARIANT ERROR 👉",
      err
    );
    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to add bike variant",
    });
  }
};
export const getBikeVariants = async (
  req,
  res
) => {
  try {
    const variants =
      await BikeVariant.find()
        .sort({
          createdAt: -1,
        })
        .populate({
          path: "model",
          select: "title imageUrl brand",
          populate: {
            path: "brand",
            select: "name logoUrl",
          },
        });
    const data =
      variants.map(
        (variant) => ({
          _id:
            variant._id.toString(),
          modelId:
            variant.model?._id
              ?.toString() || "",
          modelName:
            variant.model?.title ||
            "",
          modelImage:
            variant.model?.imageUrl ||
            "",
          brandId:
            variant.model?.brand?._id
              ?.toString() || "",
          brandName:
            variant.model?.brand?.name ||
            "",
          brandLogo:
            variant.model?.brand?.logoUrl ||
            "",
          variantName:
            variant.title || "",
          variantImage:
            variant.imageUrl || "",
        })
      );
    return res.status(200).json({
      success: true,
      bikeVariants: data,
    });
  } catch (err) {
    console.error(
      "GET BIKE VARIANTS ERROR 👉",
      err
    );
    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to get bike variants",
    });
  }
};
export const getBikeVariantsByModel =
  async (
    req,
    res
  ) => {
    try {
      const {
        modelId,
      } = req.params;
      const model =
        await BikeModel.findById(
          modelId
        ).populate(
          "brand",
          "name logoUrl"
        );
      if (!model) {
        return res.status(404).json({
          success: false,
          message: "Model not found",
        });
      }
      const variants =
        await BikeVariant.find({
          model: modelId,
        }).sort({
          createdAt: -1,
        });
      const data =
        variants.map(
          (variant) => ({
            _id:
              variant._id.toString(),
            modelId:
              model._id.toString(),
            modelName:
              model.title || "",
            modelImage:
              model.imageUrl || "",
            brandId:
              model.brand?._id
                ?.toString() || "",
            brandName:
              model.brand?.name || "",
            brandLogo:
              model.brand?.logoUrl ||
              "",
            variantName:
              variant.title || "",
            variantImage:
              variant.imageUrl || "",
          })
        );
      return res.status(200).json({
        success: true,
        bikeVariants: data,
      });
    } catch (err) {
      console.error(
        "GET BIKE VARIANTS BY MODEL ERROR 👉",
        err
      );
      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to get bike variants",
      });
    }
  };
export const updateBikeVariant =
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
        modelId,
      } = req.body;
      const bikeVariant =
        await BikeVariant.findById(
          id
        );
      if (!bikeVariant) {
        return res.status(404).json({
          success: false,
          message:
            "Bike variant not found",
        });
      }
      if (
        title &&
        title.trim()
      ) {
        const cleanTitle =
          title.trim();
        const duplicate =
          await BikeVariant.findOne({
            _id: {
              $ne: id,
            },
            model:
              modelId ||
              bikeVariant.model,
            title: new RegExp(
              `^${cleanTitle.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              )}$`,
              "i"
            ),
          });
        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "Bike variant already exists",
          });
        }
        bikeVariant.title =
          cleanTitle;
      }
      if (modelId) {
        const model =
          await BikeModel.findById(
            modelId
          );
        if (!model) {
          return res.status(404).json({
            success: false,
            message:
              "Model not found",
          });
        }
        bikeVariant.model =
          modelId;
      }
      if (req.file) {
        await deleteBikeVariantImage(
          bikeVariant.imageUrl
        );
        bikeVariant.imageUrl =
          await uploadBikeVariantImage(
            req.file
          );
      }
      await bikeVariant.save();
      return res.status(200).json({
        success: true,
        bikeVariant,
      });
    } catch (err) {
      console.error(
        "UPDATE BIKE VARIANT ERROR 👉",
        err
      );
      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to update bike variant",
      });
    }
  };
export const deleteBikeVariant =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;
      const bikeVariant =
        await BikeVariant.findById(
          id
        );
      if (!bikeVariant) {
        return res.status(404).json({
          success: false,
          message:
            "Bike variant not found",
        });
      }
      await deleteBikeVariantImage(
        bikeVariant.imageUrl
      );
      await bikeVariant.deleteOne();
      return res.status(200).json({
        success: true,
        message:
          "Bike variant deleted",
      });
    } catch (err) {
      console.error(
        "DELETE BIKE VARIANT ERROR 👉",
        err
      );
      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to delete bike variant",
      });
    }
  };
export default {
  addBikeVariant,
  getBikeVariants,
  getBikeVariantsByModel,
  updateBikeVariant,
  deleteBikeVariant,
};