import LaptopBrand from "../models/laptop_brand_model.js";
import {
  uploadLaptopBrandImage,
  deleteLaptopBrandImage,
} from "../utils/laptopBrand.js";

/* ================= CREATE ================= */
export const addLaptopBrand = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Brand name and logo required",
      });
    }

    const existing = await LaptopBrand.findOne({
      name: new RegExp(`^${name.trim()}$`, "i"),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Brand already exists",
      });
    }

    const logoUrl = await uploadLaptopBrandImage(req.file);

    const brand = await LaptopBrand.create({
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
export const getLaptopBrands = async (req, res) => {
  try {
    const brands = await LaptopBrand.find().sort({ name: 1 });

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
export const updateLaptopBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const brand = await LaptopBrand.findById(id);

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
      await deleteLaptopBrandImage(brand.logoUrl);
      brand.logoUrl = await uploadLaptopBrandImage(req.file);
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
export const deleteLaptopBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await LaptopBrand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    await deleteLaptopBrandImage(brand.logoUrl);
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