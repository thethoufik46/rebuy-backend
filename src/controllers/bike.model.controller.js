import BikeModel from "../models/bike_model_model.js";
import BikeBrand from "../models/bike_brand_model.js";

import {
  uploadBikeModelImage,
  deleteBikeModelImage,
} from "../utils/bikeModel.js";

/* =====================================================
   ADD BIKE MODEL
===================================================== */

export const addBikeModel = async (req, res) => {
  try {
    const { brandId, title } = req.body;

    if (!brandId || !title || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Brand, model title and image required",
      });
    }

    const brand = await BikeBrand.findById(brandId);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    const existing = await BikeModel.findOne({
      brand: brandId,
      title: new RegExp(`^${title.trim()}$`, "i"),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Model already exists",
      });
    }

    const imageUrl = await uploadBikeModelImage(req.file);

    const model = await BikeModel.create({
      brand: brandId,
      title: title.trim(),
      imageUrl,
    });

    res.status(201).json({
      success: true,
      model,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   GET ALL MODELS
===================================================== */

export const getAllBikeModels = async (req, res) => {
  try {
    const models = await BikeModel.find()
      .sort({ createdAt: -1 })
      .populate("brand", "name logoUrl");

    const data = models.map((m) => ({
      _id: m._id.toString(),
      brandId: m.brand?._id?.toString() || "",
      brandName: m.brand?.name || "",
      brandLogo: m.brand?.logoUrl || "",
      modelName: m.title || "",
      modelImage: m.imageUrl || "",
    }));

    res.status(200).json({
      success: true,
      models: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   MODELS BY BRAND
===================================================== */

export const getBikeModelsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    const models = await BikeModel.find({
      brand: brandId,
    })
      .sort({ title: 1 })
      .populate("brand", "name logoUrl");

    const data = models.map((m) => ({
      _id: m._id.toString(),
      brandId: m.brand?._id?.toString() || "",
      brandName: m.brand?.name || "",
      brandLogo: m.brand?.logoUrl || "",
      modelName: m.title || "",
      modelImage: m.imageUrl || "",
    }));

    res.status(200).json({
      success: true,
      models: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   UPDATE MODEL
===================================================== */

export const updateBikeModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, brandId } = req.body;

    const model = await BikeModel.findById(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "Model not found",
      });
    }

    if (title?.trim()) model.title = title.trim();

    if (brandId) model.brand = brandId;

    if (req.file) {
      await deleteBikeModelImage(model.imageUrl);
      model.imageUrl = await uploadBikeModelImage(req.file);
    }

    await model.save();

    res.status(200).json({
      success: true,
      model,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   DELETE MODEL
===================================================== */

export const deleteBikeModel = async (req, res) => {
  try {
    const { id } = req.params;

    const model = await BikeModel.findById(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "Model not found",
      });
    }

    await deleteBikeModelImage(model.imageUrl);

    await model.deleteOne();

    res.status(200).json({
      success: true,
      message: "Model deleted",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};