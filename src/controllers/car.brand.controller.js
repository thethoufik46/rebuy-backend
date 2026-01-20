// ======================= car.brand.controller.js =======================
// C:\flutter_projects\rebuy-backend\src\controllers\car.brand.controller.js

import Brand from "../models/car_brand_model.js";
import {
  uploadBrandLogo,
  deleteBrandLogo,
} from "../utils/carBrand.js";

/* =====================================================
   CREATE BRAND
===================================================== */
export const addBrand = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Brand name and logo required",
      });
    }

    const existing = await Brand.findOne({
      name: new RegExp(`^${name}$`, "i"),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Brand already exists",
      });
    }

    const logoUrl = await uploadBrandLogo(req.file);

    const brand = await Brand.create({
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

/* =====================================================
   GET ALL BRANDS
===================================================== */
export const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });

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

/* =====================================================
   UPDATE BRAND
===================================================== */
export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    if (name) {
      brand.name = name.trim();
    }

    if (req.file) {
      await deleteBrandLogo(brand.logoUrl);
      brand.logoUrl = await uploadBrandLogo(req.file);
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

/* =====================================================
   DELETE BRAND
===================================================== */
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    await deleteBrandLogo(brand.logoUrl);
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
