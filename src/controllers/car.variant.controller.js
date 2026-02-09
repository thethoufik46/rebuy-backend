// ======================= car.variant.controller.js =======================
// 📁 src/controllers/car.variant.controller.js
// ✅ FINAL FULL CONTROLLER – ADD / VIEW / UPDATE / DELETE (EDIT BRAND SUPPORT)

import Variant from "../models/car_variant_model.js";
import Brand from "../models/car_brand_model.js";
import {
  uploadVariantImage,
  deleteVariantImage,
} from "../utils/carVariant.js";

/* =====================================================
   ADD VARIANT
===================================================== */
export const addVariant = async (req, res) => {
  try {
    const { brandId, title } = req.body;

    if (!brandId || !title || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Brand, variant title and image are required",
      });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    const existing = await Variant.findOne({
      brand: brandId,
      title: new RegExp(`^${title.trim()}$`, "i"),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Variant already exists for this brand",
      });
    }

    const imageUrl = await uploadVariantImage(req.file);

    const variant = await Variant.create({
      brand: brandId,
      title: title.trim(),
      imageUrl,
    });

    return res.status(201).json({
      success: true,
      variant,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   GET ALL VARIANTS ✅ (brandId INCLUDED)
===================================================== */
export const getAllVariants = async (req, res) => {
  try {
    const variants = await Variant.find()
      .sort({ createdAt: -1 })
      .populate("brand", "name logoUrl");

    const data = variants.map((v) => ({
      _id: v._id,
      brandId: v.brand?._id,              // ✅ IMPORTANT
      brandName: v.brand?.name || "",
      brandLogo: v.brand?.logoUrl || "",
      variantName: v.title || "",
      variantImage: v.imageUrl || "",
    }));

    return res.status(200).json({
      success: true,
      variants: data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   GET VARIANTS BY BRAND ✅ (brandId INCLUDED)
===================================================== */
export const getVariantsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    const variants = await Variant.find({ brand: brandId })
      .sort({ title: 1 })
      .populate("brand", "name logoUrl");

    const data = variants.map((v) => ({
      _id: v._id,
      brandId: v.brand?._id,              // ✅ IMPORTANT
      brandName: v.brand?.name || "",
      brandLogo: v.brand?.logoUrl || "",
      variantName: v.title || "",
      variantImage: v.imageUrl || "",
    }));

    return res.status(200).json({
      success: true,
      variants: data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   UPDATE VARIANT (TITLE + BRAND + IMAGE)
===================================================== */
export const updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, brandId } = req.body;

    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    if (title && title.trim()) {
      variant.title = title.trim();
    }

    if (brandId) {
      const brand = await Brand.findById(brandId);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }
      variant.brand = brandId;
    }

    if (req.file) {
      await deleteVariantImage(variant.imageUrl);
      variant.imageUrl = await uploadVariantImage(req.file);
    }

    await variant.save();

    return res.status(200).json({
      success: true,
      variant,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =====================================================
   DELETE VARIANT
===================================================== */
export const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    await deleteVariantImage(variant.imageUrl);
    await variant.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Variant deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
