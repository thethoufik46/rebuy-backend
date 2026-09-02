// ======================= bike.model.controller.js =======================

import BikeModel from "../../../models/bike/model/bike_model_model.js";

import BikeBrand from "../../../models/bike/brand/bike_brand_model.js";

import {
  uploadBikeModelImage,
  deleteBikeModelImage,
} from "../../../utils/bike/model/bikeModel.js";

// =====================================================
// ADD BIKE MODEL
// =====================================================

export const addBikeModel = async (req, res) => {
  try {
    const { brandId, title } = req.body;

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!brandId || !title?.trim() || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Brand, model title and image required",
      });
    }

    // -------------------------------------------------
    // CHECK BRAND
    // -------------------------------------------------

    const brand = await BikeBrand.findById(brandId);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // -------------------------------------------------
    // CHECK DUPLICATE MODEL
    // Same model title under same brand
    // -------------------------------------------------

    const existing = await BikeModel.findOne({
      brand: brandId,
      title: new RegExp(
        `^${title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      ),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Model already exists",
      });
    }

    // -------------------------------------------------
    // UPLOAD IMAGE
    // -------------------------------------------------

    const imageUrl = await uploadBikeModelImage(req.file);

    // -------------------------------------------------
    // CREATE MODEL
    // -------------------------------------------------

    const model = await BikeModel.create({
      brand: brandId,
      title: title.trim(),
      imageUrl,
    });

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(201).json({
      success: true,
      model,
    });
  } catch (err) {
    console.error("Add bike model error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// GET ALL BIKE MODELS
// =====================================================

export const getBikeModels = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      models: data,
    });
  } catch (err) {
    console.error("Get bike models error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// GET BIKE MODELS BY BRAND
// =====================================================

export const getBikeModelsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    // -------------------------------------------------
    // CHECK BRAND
    // -------------------------------------------------

    const brand = await BikeBrand.findById(brandId);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // -------------------------------------------------
    // GET MODELS
    // -------------------------------------------------

    const models = await BikeModel.find({
      brand: brandId,
    })
      .sort({ title: 1 })
      .populate("brand", "name logoUrl");

    // -------------------------------------------------
    // FORMAT RESPONSE
    // -------------------------------------------------

    const data = models.map((m) => ({
      _id: m._id.toString(),

      brandId: m.brand?._id?.toString() || "",

      brandName: m.brand?.name || "",

      brandLogo: m.brand?.logoUrl || "",

      modelName: m.title || "",

      modelImage: m.imageUrl || "",
    }));

    return res.status(200).json({
      success: true,
      models: data,
    });
  } catch (err) {
    console.error("Get bike models by brand error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// UPDATE BIKE MODEL
// =====================================================

export const updateBikeModel = async (req, res) => {
  try {
    const { id } = req.params;

    const { title, brandId } = req.body;

    // -------------------------------------------------
    // FIND MODEL
    // -------------------------------------------------

    const model = await BikeModel.findById(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "Model not found",
      });
    }

    // -------------------------------------------------
    // UPDATE TITLE
    // -------------------------------------------------

    if (title?.trim()) {
      model.title = title.trim();
    }

    // -------------------------------------------------
    // UPDATE BRAND
    // -------------------------------------------------

    if (brandId) {
      const brand = await BikeBrand.findById(brandId);

      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }

      model.brand = brandId;
    }

    // -------------------------------------------------
    // UPDATE IMAGE
    // -------------------------------------------------

    if (req.file) {
      // Delete old image
      await deleteBikeModelImage(model.imageUrl);

      // Upload new image
      const newImageUrl = await uploadBikeModelImage(req.file);

      model.imageUrl = newImageUrl;
    }

    // -------------------------------------------------
    // SAVE
    // -------------------------------------------------

    await model.save();

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(200).json({
      success: true,
      model,
    });
  } catch (err) {
    console.error("Update bike model error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// DELETE BIKE MODEL
// =====================================================

export const deleteBikeModel = async (req, res) => {
  try {
    const { id } = req.params;

    // -------------------------------------------------
    // FIND MODEL
    // -------------------------------------------------

    const model = await BikeModel.findById(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "Model not found",
      });
    }

    // -------------------------------------------------
    // DELETE IMAGE FROM R2
    // -------------------------------------------------

    await deleteBikeModelImage(model.imageUrl);

    // -------------------------------------------------
    // DELETE DATABASE DOCUMENT
    // -------------------------------------------------

    await model.deleteOne();

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Model deleted",
    });
  } catch (err) {
    console.error("Delete bike model error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};