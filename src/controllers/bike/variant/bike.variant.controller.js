// ======================= bike.variant.controller.js =======================

import mongoose from "mongoose";

import BikeVariant from "../../../models/bike/variant/bike_variant_model.js";

import BikeModel from "../../../models/bike/model/bike_model_model.js";

import {
  uploadBikeVariantImage,
  deleteBikeVariantImage,
} from "../../../utils/bike/variant/bikeVariant.js";

// =====================================================
// ADD BIKE VARIANT
// =====================================================

export const addBikeVariant = async (req, res) => {
  try {
    const { modelId, title } = req.body;

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!modelId || !title?.trim() || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Bike model, variant title and image required",
      });
    }

    // -------------------------------------------------
    // VALIDATE MODEL ID
    // -------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(modelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bike model ID",
      });
    }

    // -------------------------------------------------
    // CHECK BIKE MODEL
    // -------------------------------------------------

    const bikeModel = await BikeModel.findById(modelId);

    if (!bikeModel) {
      return res.status(404).json({
        success: false,
        message: "Bike model not found",
      });
    }

    // -------------------------------------------------
    // CHECK DUPLICATE VARIANT
    // Same variant title under same model
    // -------------------------------------------------

    const escapedTitle = title
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const existing = await BikeVariant.findOne({
      bikeModel: modelId,
      title: new RegExp(`^${escapedTitle}$`, "i"),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Variant already exists",
      });
    }

    // -------------------------------------------------
    // UPLOAD IMAGE
    // -------------------------------------------------

    const imageUrl = await uploadBikeVariantImage(req.file);

    // -------------------------------------------------
    // CREATE VARIANT
    // -------------------------------------------------

    const variant = await BikeVariant.create({
      bikeModel: modelId,
      title: title.trim(),
      imageUrl,
    });

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(201).json({
      success: true,
      variant,
    });
  } catch (err) {
    console.error("Add bike variant error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// GET ALL BIKE VARIANTS
// =====================================================

export const getBikeVariants = async (req, res) => {
  try {
    const variants = await BikeVariant.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "bikeModel",
        select: "title imageUrl brand",
        populate: {
          path: "brand",
          select: "name logoUrl",
        },
      });

    const data = variants.map((v) => ({
      _id: v._id.toString(),

      modelId: v.bikeModel?._id?.toString() || "",

      modelName: v.bikeModel?.title || "",

      modelImage: v.bikeModel?.imageUrl || "",

      brandId:
        v.bikeModel?.brand?._id?.toString() || "",

      brandName:
        v.bikeModel?.brand?.name || "",

      brandLogo:
        v.bikeModel?.brand?.logoUrl || "",

      variantName: v.title || "",

      variantImage: v.imageUrl || "",
    }));

    return res.status(200).json({
      success: true,
      variants: data,
    });
  } catch (err) {
    console.error("Get bike variants error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// GET BIKE VARIANTS BY MODEL
// =====================================================

export const getBikeVariantsByModel = async (req, res) => {
  try {
    const { modelId } = req.params;

    // -------------------------------------------------
    // VALIDATE MODEL ID
    // -------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(modelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bike model ID",
      });
    }

    // -------------------------------------------------
    // CHECK BIKE MODEL
    // -------------------------------------------------

    const bikeModel = await BikeModel.findById(modelId).populate(
      "brand",
      "name logoUrl"
    );

    if (!bikeModel) {
      return res.status(404).json({
        success: false,
        message: "Bike model not found",
      });
    }

    // -------------------------------------------------
    // GET VARIANTS
    // -------------------------------------------------

    const variants = await BikeVariant.find({
      bikeModel: modelId,
    }).sort({
      title: 1,
    });

    // -------------------------------------------------
    // FORMAT RESPONSE
    // -------------------------------------------------

    const data = variants.map((v) => ({
      _id: v._id.toString(),

      modelId: bikeModel._id.toString(),

      modelName: bikeModel.title || "",

      modelImage: bikeModel.imageUrl || "",

      brandId:
        bikeModel.brand?._id?.toString() || "",

      brandName:
        bikeModel.brand?.name || "",

      brandLogo:
        bikeModel.brand?.logoUrl || "",

      variantName: v.title || "",

      variantImage: v.imageUrl || "",
    }));

    return res.status(200).json({
      success: true,
      variants: data,
    });
  } catch (err) {
    console.error(
      "Get bike variants by model error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// UPDATE BIKE VARIANT
// =====================================================

export const updateBikeVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const { title, modelId } = req.body;

    // -------------------------------------------------
    // VALIDATE VARIANT ID
    // -------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bike variant ID",
      });
    }

    // -------------------------------------------------
    // FIND VARIANT
    // -------------------------------------------------

    const variant = await BikeVariant.findById(id);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Bike variant not found",
      });
    }

    // -------------------------------------------------
    // DETERMINE FINAL MODEL
    // -------------------------------------------------

    const finalModelId =
      modelId || variant.bikeModel?.toString();

    // -------------------------------------------------
    // VALIDATE MODEL IF CHANGED
    // -------------------------------------------------

    if (
      finalModelId &&
      !mongoose.Types.ObjectId.isValid(finalModelId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid bike model ID",
      });
    }

    if (modelId) {
      const bikeModel = await BikeModel.findById(modelId);

      if (!bikeModel) {
        return res.status(404).json({
          success: false,
          message: "Bike model not found",
        });
      }
    }

    // -------------------------------------------------
    // CHECK DUPLICATE WHEN TITLE / MODEL CHANGES
    // -------------------------------------------------

    const finalTitle =
      title?.trim() || variant.title;

    const escapedTitle = finalTitle
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const duplicate = await BikeVariant.findOne({
      _id: { $ne: id },
      bikeModel: finalModelId,
      title: new RegExp(`^${escapedTitle}$`, "i"),
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Variant already exists",
      });
    }

    // -------------------------------------------------
    // UPDATE TITLE
    // -------------------------------------------------

    if (title?.trim()) {
      variant.title = title.trim();
    }

    // -------------------------------------------------
    // UPDATE MODEL
    // -------------------------------------------------

    if (modelId) {
      variant.bikeModel = modelId;
    }

    // -------------------------------------------------
    // UPDATE IMAGE
    // -------------------------------------------------

    if (req.file) {
      // Delete old image
      await deleteBikeVariantImage(
        variant.imageUrl
      );

      // Upload new image
      const newImageUrl =
        await uploadBikeVariantImage(req.file);

      variant.imageUrl = newImageUrl;
    }

    // -------------------------------------------------
    // SAVE
    // -------------------------------------------------

    await variant.save();

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(200).json({
      success: true,
      variant,
    });
  } catch (err) {
    console.error(
      "Update bike variant error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// DELETE BIKE VARIANT
// =====================================================

export const deleteBikeVariant = async (req, res) => {
  try {
    const { id } = req.params;

    // -------------------------------------------------
    // VALIDATE ID
    // -------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bike variant ID",
      });
    }

    // -------------------------------------------------
    // FIND VARIANT
    // -------------------------------------------------

    const variant = await BikeVariant.findById(id);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Bike variant not found",
      });
    }

    // -------------------------------------------------
    // DELETE IMAGE FROM R2
    // -------------------------------------------------

    await deleteBikeVariantImage(
      variant.imageUrl
    );

    // -------------------------------------------------
    // DELETE DATABASE DOCUMENT
    // -------------------------------------------------

    await variant.deleteOne();

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Bike variant deleted successfully",
    });
  } catch (err) {
    console.error(
      "Delete bike variant error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};