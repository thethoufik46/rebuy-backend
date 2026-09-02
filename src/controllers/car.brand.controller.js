// ======================= car.brand.controller.js =======================
// C:\flutter_projects\rebuy-backend\src\controllers\car.brand.controller.js

import CarBrand from "../models/car_brand_model.js";

import {
  uploadCarImage,
  deleteCarImage,
} from "../utils/carBrand.js";

// =====================================================
// CREATE CAR BRAND
// =====================================================

export const addBrand = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Car brand name and logo required",
      });
    }

    const cleanName = name.trim();

    const existing = await CarBrand.findOne({
      name: new RegExp(
        `^${cleanName}$`,
        "i"
      ),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Car brand already exists",
      });
    }

    // New logos go into carbrands/
    const logoUrl = await uploadCarImage(
      req.file,
      "carbrands"
    );

    const carBrand = await CarBrand.create({
      name: cleanName,
      logoUrl,
    });

    return res.status(201).json({
      success: true,
      brand: carBrand,
    });
  } catch (err) {
    console.error(
      "❌ CREATE CAR BRAND ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// GET CAR BRANDS
// =====================================================

export const getBrands = async (req, res) => {
  try {
    let brands = await CarBrand.find();

    brands.sort((a, b) => {
      const aName = a.name.trim().toLowerCase();
      const bName = b.name.trim().toLowerCase();

      // 1. Toyota always first
      if (aName === "toyota") return -1;
      if (bName === "toyota") return 1;

      // 2. Maruti Suzuki always second
      if (aName === "maruti suzuki") return -1;
      if (bName === "maruti suzuki") return 1;

      // 3. Others alphabetical
      return a.name.localeCompare(
        b.name
      );
    });

    return res.status(200).json({
      success: true,
      brands,
    });
  } catch (err) {
    console.error(
      "❌ GET CAR BRANDS ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// UPDATE CAR BRAND
// =====================================================

export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const carBrand =
      await CarBrand.findById(id);

    if (!carBrand) {
      return res.status(404).json({
        success: false,
        message: "Car brand not found",
      });
    }

    // -------------------------------------------------
    // UPDATE NAME
    // -------------------------------------------------

    if (name && name.trim()) {
      const cleanName = name.trim();

      const duplicate =
        await CarBrand.findOne({
          name: new RegExp(
            `^${cleanName}$`,
            "i"
          ),
          _id: {
            $ne: id,
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Car brand already exists",
        });
      }

      carBrand.name = cleanName;
    }

    // -------------------------------------------------
    // UPDATE LOGO
    // -------------------------------------------------

    if (req.file) {
      await deleteCarImage(
        carBrand.logoUrl
      );

      carBrand.logoUrl =
        await uploadCarImage(
          req.file,
          "carbrands"
        );
    }

    await carBrand.save();

    return res.status(200).json({
      success: true,
      brand: carBrand,
    });
  } catch (err) {
    console.error(
      "❌ UPDATE CAR BRAND ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// DELETE CAR BRAND
// =====================================================

export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const carBrand =
      await CarBrand.findById(id);

    if (!carBrand) {
      return res.status(404).json({
        success: false,
        message: "Car brand not found",
      });
    }

    // Delete logo from R2
    await deleteCarImage(
      carBrand.logoUrl
    );

    // Delete MongoDB document
    await carBrand.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Car brand deleted successfully",
    });
  } catch (err) {
    console.error(
      "❌ DELETE CAR BRAND ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};