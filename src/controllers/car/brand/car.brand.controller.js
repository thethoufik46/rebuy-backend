// ============================================================
// CAR BRAND CONTROLLER
// RE2BUY
// ============================================================

import CarBrand from "../../../models/car/brand/car_brand_model.js";

import {
  uploadCarBrandLogo,
  deleteCarBrandLogo,
} from "../../../utils/car/brand/carBrand.js";

// ============================================================
// ADD CAR BRAND
// ============================================================

export const addCarBrand = async (
  req,
  res
) => {
  try {
    const {
      name,
    } = req.body;

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (
      !name ||
      !name.trim() ||
      !req.file
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Car brand name and logo are required",
      });
    }

    const cleanName =
      name.trim();

    // ----------------------------------------------------------
    // CHECK DUPLICATE
    // ----------------------------------------------------------

    const existing =
      await CarBrand.findOne({
        name: new RegExp(
          `^${cleanName.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}$`,
          "i"
        ),
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Car brand already exists",
      });
    }

    // ----------------------------------------------------------
    // UPLOAD LOGO
    // ----------------------------------------------------------

    const logoUrl =
      await uploadCarBrandLogo(
        req.file
      );

    // ----------------------------------------------------------
    // CREATE CAR BRAND
    // ----------------------------------------------------------

    const carBrand =
      await CarBrand.create({
        name: cleanName,
        logoUrl,
      });

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,
      carBrand,
    });
  } catch (err) {
    console.error(
      "ADD CAR BRAND ERROR 👉",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to add car brand",
    });
  }
};

// ============================================================
// GET ALL CAR BRANDS
// ============================================================

export const getAllCarBrands =
  async (
    req,
    res
  ) => {
    try {
      const brands =
        await CarBrand.find()
          .sort({
            createdAt: -1,
          })
          .lean();

      const data =
        brands.map(
          (brand) => ({
            _id:
              brand._id.toString(),

            name:
              brand.name || "",

            logoUrl:
              brand.logoUrl || "",

            // Flutter compatibility
            logo:
              brand.logoUrl || "",
          })
        );

      return res.status(200).json({
        success: true,
        brands: data,
      });
    } catch (err) {
      console.error(
        "GET ALL CAR BRANDS ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to get car brands",
      });
    }
  };

// ============================================================
// GET SINGLE CAR BRAND
// ============================================================

export const getCarBrandById =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const brand =
        await CarBrand.findById(
          id
        );

      if (!brand) {
        return res.status(404).json({
          success: false,
          message:
            "Car brand not found",
        });
      }

      return res.status(200).json({
        success: true,
        carBrand: brand,
      });
    } catch (err) {
      console.error(
        "GET CAR BRAND ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to get car brand",
      });
    }
  };

// ============================================================
// UPDATE CAR BRAND
// ============================================================

export const updateCarBrand =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const {
        name,
      } = req.body;

      // --------------------------------------------------------
      // FIND BRAND
      // --------------------------------------------------------

      const carBrand =
        await CarBrand.findById(
          id
        );

      if (!carBrand) {
        return res.status(404).json({
          success: false,
          message:
            "Car brand not found",
        });
      }

      // --------------------------------------------------------
      // UPDATE NAME
      // --------------------------------------------------------

      if (
        name &&
        name.trim()
      ) {
        const cleanName =
          name.trim();

        const duplicate =
          await CarBrand.findOne({
            _id: {
              $ne: id,
            },

            name: new RegExp(
              `^${cleanName.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              )}$`,
              "i"
            ),
          });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "Car brand already exists",
          });
        }

        carBrand.name =
          cleanName;
      }

      // --------------------------------------------------------
      // UPDATE LOGO
      // --------------------------------------------------------

      if (req.file) {
        // Delete old logo
        if (carBrand.logoUrl) {
          await deleteCarBrandLogo(
            carBrand.logoUrl
          );
        }

        // Upload new logo
        carBrand.logoUrl =
          await uploadCarBrandLogo(
            req.file
          );
      }

      // --------------------------------------------------------
      // SAVE
      // --------------------------------------------------------

      await carBrand.save();

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        carBrand,
      });
    } catch (err) {
      console.error(
        "UPDATE CAR BRAND ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to update car brand",
      });
    }
  };

// ============================================================
// DELETE CAR BRAND
// ============================================================

export const deleteCarBrand =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      // --------------------------------------------------------
      // FIND BRAND
      // --------------------------------------------------------

      const carBrand =
        await CarBrand.findById(
          id
        );

      if (!carBrand) {
        return res.status(404).json({
          success: false,
          message:
            "Car brand not found",
        });
      }

      // --------------------------------------------------------
      // DELETE R2 LOGO
      // --------------------------------------------------------

      if (carBrand.logoUrl) {
        await deleteCarBrandLogo(
          carBrand.logoUrl
        );
      }

      // --------------------------------------------------------
      // DELETE DATABASE DOCUMENT
      // --------------------------------------------------------

      await carBrand.deleteOne();

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Car brand deleted",
      });
    } catch (err) {
      console.error(
        "DELETE CAR BRAND ERROR 👉",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to delete car brand",
      });
    }
  };

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  addCarBrand,
  getAllCarBrands,
  getCarBrandById,
  updateCarBrand,
  deleteCarBrand,
};