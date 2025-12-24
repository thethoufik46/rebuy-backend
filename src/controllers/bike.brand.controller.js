import BikeBrand from "../models/bike_brand_model.js";
import cloudinary from "../config/cloudinary.js";

/* =========================
   🟢 CREATE BIKE BRAND
========================= */
export const addBikeBrand = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !req.file) {
      return res
        .status(400)
        .json({ message: "Brand name and logo are required" });
    }

    // ✅ prevent duplicate brand (name is IMPORTANT)
    const exists = await BikeBrand.findOne({
      name: name.trim().toLowerCase(),
    });

    if (exists) {
      return res.status(409).json({
        message: "Brand already exists",
      });
    }

    const brand = await BikeBrand.create({
      name: name.trim(), // lowercase handled in model
      logoUrl: req.file.path, // Cloudinary URL
    });

    res.status(201).json({
      success: true,
      message: "Bike brand added successfully",
      brand,
    });
  } catch (error) {
    console.error("Error adding bike brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔵 GET BIKE BRANDS
========================= */
export const getBikeBrands = async (req, res) => {
  try {
    const brands = await BikeBrand.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: brands.length,
      brands,
    });
  } catch (error) {
    console.error("Error fetching bike brands:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🟡 UPDATE BIKE BRAND
========================= */
export const updateBikeBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const brand = await BikeBrand.findById(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // ✅ check duplicate name (except current brand)
    if (name) {
      const exists = await BikeBrand.findOne({
        _id: { $ne: id },
        name: name.trim().toLowerCase(),
      });

      if (exists) {
        return res.status(409).json({
          message: "Brand name already exists",
        });
      }

      brand.name = name.trim();
    }

    // ✅ replace logo
    if (req.file) {
      if (brand.logoUrl) {
        const publicId = brand.logoUrl
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0];

        await cloudinary.uploader.destroy(publicId);
      }

      brand.logoUrl = req.file.path;
    }

    await brand.save();

    res.status(200).json({
      success: true,
      message: "Bike brand updated successfully",
      brand,
    });
  } catch (error) {
    console.error("Error updating bike brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔴 DELETE BIKE BRAND
========================= */
export const deleteBikeBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await BikeBrand.findById(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // ✅ delete logo from Cloudinary
    if (brand.logoUrl) {
      const publicId = brand.logoUrl
        .split("/")
        .slice(-2)
        .join("/")
        .split(".")[0];

      await cloudinary.uploader.destroy(publicId);
    }

    await brand.deleteOne();

    res.status(200).json({
      success: true,
      message: "Bike brand deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bike brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
