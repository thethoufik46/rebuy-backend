// ======================= bike.brand.controller.js =======================

import BikeBrand from "../models/bike_brand_model.js";
import {
  uploadBikeImage,
  deleteBikeImage,
} from "../utils/bikeBrand.js";

/* =====================================================
   CREATE BRAND
===================================================== */
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

    const logoUrl = await uploadBikeImage(req.file, "bike-brands");

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

/* =====================================================
   GET BRANDS
===================================================== */
export const getBikeBrands = async (req, res) => {
  try {
    const brands = await BikeBrand.find().sort({ name: 1 });

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
      await deleteBikeImage(brand.logoUrl);
      brand.logoUrl = await uploadBikeImage(req.file, "bike-brands");
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

    await deleteBikeImage(brand.logoUrl);
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
