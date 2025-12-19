import Brand from "../models/brand_model.js";
import cloudinary from "../config/cloudinary.js";

/* =========================
   🟢 CREATE BRAND
========================= */
export const addBrand = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !req.file) {
      return res
        .status(400)
        .json({ message: "Brand name and logo are required" });
    }

    const brand = await Brand.create({
      name: name.trim(),
      logoUrl: req.file.path, // ✅ Cloudinary URL
    });

    res.status(201).json({
      success: true,
      message: "Brand added successfully",
      brand,
    });
  } catch (error) {
    console.error("Error adding brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔵 GET BRANDS
========================= */
export const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: brands.length,
      brands,
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🟡 UPDATE BRAND
========================= */
export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Replace logo if new one uploaded
    if (req.file) {
      const publicId = brand.logoUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`brands/${publicId}`);

      brand.logoUrl = req.file.path; // ✅ new Cloudinary URL
    }

    if (name) brand.name = name.trim();

    await brand.save();

    res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      brand,
    });
  } catch (error) {
    console.error("Error updating brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   🔴 DELETE BRAND
========================= */
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Delete logo from Cloudinary
    const publicId = brand.logoUrl.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(`brands/${publicId}`);

    await brand.deleteOne();

    res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
