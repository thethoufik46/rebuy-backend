import PcBrand from "../models/pc_brand_model.js";
import {
  uploadPcBrandImage,
  deletePcBrandImage,
} from "../utils/pcBrand.js";

/* ================= CREATE ================= */
export const addPcBrand = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Brand name and logo required",
      });
    }

    const existing = await PcBrand.findOne({
      name: new RegExp(`^${name.trim()}$`, "i"),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Brand already exists",
      });
    }

    const logoUrl = await uploadPcBrandImage(req.file);

    const brand = await PcBrand.create({
      name: name.trim(),
      logoUrl,
    });

    return res.status(201).json({
      success: true,
      brand,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Brand already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= GET ================= */
export const getPcBrands = async (req, res) => {
  try {
    const brands = await PcBrand.find().sort({ name: 1 });

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

/* ================= UPDATE ================= */
export const updatePcBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const brand = await PcBrand.findById(id);

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
      await deletePcBrandImage(brand.logoUrl);
      brand.logoUrl = await uploadPcBrandImage(req.file);
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

/* ================= DELETE ================= */
export const deletePcBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await PcBrand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    await deletePcBrandImage(brand.logoUrl);
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