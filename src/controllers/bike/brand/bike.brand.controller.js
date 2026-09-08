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
    if (!name || !name.trim() || !req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Bike brand name and logo are required",
      });
    }
    const cleanName = name.trim();
    const existing = await BikeBrand.findOne({
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
        message: "Bike brand already exists",
      });
    }
    const logoUrl =
      await uploadBikeBrandLogo(req.file);
    const bikeBrand = await BikeBrand.create({
      name: cleanName,
      logoUrl,
    });
    return res.status(201).json({
      success: true,
      bikeBrand,
    });
  } catch (err) {
    console.error(
      "ADD BIKE BRAND ERROR 👉",
      err
    );
    return res.status(500).json({
      success: false,
      message:
        err.message || "Failed to add bike brand",
    });
  }
};
export const getBikeBrands = async (req, res) => {
  try {
    const brands = await BikeBrand.find()
      .sort({
        createdAt: -1,
      })
      .lean();
    const data = brands.map((brand) => ({
      _id: brand._id.toString(),
      name: brand.name || "",
      logoUrl: brand.logoUrl || "",
      logo: brand.logoUrl || "",
    }));
    return res.status(200).json({
      success: true,
      brands: data,
    });
  } catch (err) {
    console.error(
      "GET BIKE BRANDS ERROR 👉",
      err
    );
    return res.status(500).json({
      success: false,
      message:
        err.message || "Failed to get bike brands",
    });
  }
};
export const getBikeBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await BikeBrand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Bike brand not found",
      });
    }
    return res.status(200).json({
      success: true,
      bikeBrand: brand,
    });
  } catch (err) {
    console.error(
      "GET BIKE BRAND ERROR 👉",
      err
    );
    return res.status(500).json({
      success: false,
      message:
        err.message || "Failed to get bike brand",
    });
  }
};
export const updateBikeBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const bikeBrand =
      await BikeBrand.findById(id);
    if (!bikeBrand) {
      return res.status(404).json({
        success: false,
        message: "Bike brand not found",
      });
    }
    if (name && name.trim()) {
      const cleanName = name.trim();
      const duplicate =
        await BikeBrand.findOne({
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
          message: "Bike brand already exists",
        });
      }
      bikeBrand.name = cleanName;
    }
    if (req.file) {
      if (bikeBrand.logoUrl) {
        await deleteBikeBrandLogo(
          bikeBrand.logoUrl
        );
      }
      bikeBrand.logoUrl =
        await uploadBikeBrandLogo(req.file);
    }
    await bikeBrand.save();
    return res.status(200).json({
      success: true,
      bikeBrand,
    });
  } catch (err) {
    console.error(
      "UPDATE BIKE BRAND ERROR 👉",
      err
    );
    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to update bike brand",
    });
  }
};
export const deleteBikeBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const bikeBrand =
      await BikeBrand.findById(id);
    if (!bikeBrand) {
      return res.status(404).json({
        success: false,
        message: "Bike brand not found",
      });
    }
    if (bikeBrand.logoUrl) {
      await deleteBikeBrandLogo(
        bikeBrand.logoUrl
      );
    }
    await bikeBrand.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Bike brand deleted",
    });
  } catch (err) {
    console.error(
      "DELETE BIKE BRAND ERROR 👉",
      err
    );
    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to delete bike brand",
    });
  }
};
export default {
  addBikeBrand,
  getBikeBrands,
  getBikeBrandById,
  updateBikeBrand,
  deleteBikeBrand,
};