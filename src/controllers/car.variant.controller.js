// ======================= car.variant.controller.js =======================
// 📁 src/controllers/car.variant.controller.js
// ✅ FINAL FULL CONTROLLER – ADD / VIEW / UPDATE / DELETE (FIXED ID FORMAT)

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
   GET ALL VARIANTS ✅ FIXED
===================================================== */
export const getAllVariants = async (req, res) => {
  try {
    const variants = await Variant.find()
      .sort({ createdAt: -1 })
      .populate("brand", "name logoUrl");

    const data = variants.map((v) => ({
      _id: v._id.toString(),                      // ✅ FIXED
      brandId: v.brand?._id?.toString() || "",     // ✅ FIXED
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
   GET ONE BRAND HIDE VARIANTS ✅
===================================================== */
export const getONEBrandhideVariants = async (req, res) => {
  try {

    /// ✅ BRAND NAME TO HIDE
    const hiddenBrandName = "load vehicles லோடு வாகனங்கள்";

    const variants = await Variant.find()
      .sort({ createdAt: -1 })
      .populate("brand", "name logoUrl");

    /// ✅ FILTER
    const filtered = variants.filter(
      (v) => v.brand?.name?.toLowerCase() !== hiddenBrandName
    );

    const data = filtered.map((v) => ({
      _id: v._id.toString(),
      brandId: v.brand?._id?.toString() || "",
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
   GET LOAD VEHICLES VARIANTS ONLY ✅
===================================================== */
export const getLoadVehiclesVariants = async (req, res) => {
  try {

    /// ✅ TARGET BRAND
    const targetBrandName = "load vehicles லோடு வாகனங்கள்";

    const variants = await Variant.find()
      .sort({ createdAt: -1 })
      .populate("brand", "name logoUrl");

    /// ✅ FILTER ONLY THIS BRAND
    const filteredVariants = variants.filter(
      (v) => v.brand?.name?.toLowerCase() === targetBrandName
    );

    const data = filteredVariants.map((v) => ({
      _id: v._id.toString(),
      brandId: v.brand?._id?.toString() || "",
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
   GET VARIANTS BY BRAND ✅ FIXED
===================================================== */
export const getVariantsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    const variants = await Variant.find({ brand: brandId })
      .sort({ title: 1 })
      .populate("brand", "name logoUrl");

    const data = variants.map((v) => ({
      _id: v._id.toString(),                      // ✅ FIXED
      brandId: v.brand?._id?.toString() || "",     // ✅ FIXED
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
   UPDATE VARIANT
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
