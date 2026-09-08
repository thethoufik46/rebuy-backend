// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import BikeBrand from "../../../models/bike/brand/bike_brand_model.js";
import {
  uploadBikeBrandLogo,
  deleteBikeBrandLogo,
} from "../../../utils/bike/brand/bikeBrand.js";
export const addBikeBrand = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Brand name and logo required",
      });
    }
    const existing = await BikeBrand.findOne({
      name: new RegExp(`^${name.trim()}$`, "i"),
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Brand already exists",
      });
    }
    const logoUrl = await uploadBikeBrandLogo(
      req.file,
      "bike-brands"
    );
    const brand = await BikeBrand.create({
      name: name.trim(),
      logoUrl,
    });
    return res.status(201).json({
      success: true,
      brand,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const getBikeBrands = async (req, res) => {
  try {
    const brands = await BikeBrand.find().sort({
      name: 1,
    });
    return res.status(200).json({
      success: true,
      brands,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const updateBikeBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const brand = await BikeBrand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }
    if (name && name.trim()) {
      brand.name = name.trim();
    }
    if (req.file) {
      await deleteBikeBrandLogo(brand.logoUrl);
      brand.logoUrl = await uploadBikeBrandLogo(
        req.file,
        "bike-brands"
      );
    }
    await brand.save();
    return res.status(200).json({
      success: true,
      brand,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const deleteBikeBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await BikeBrand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }
    await deleteBikeBrandLogo(brand.logoUrl);
    await brand.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};