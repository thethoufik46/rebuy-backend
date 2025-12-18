import Brand from "../models/brand_model.js";
import cloudinary from "../config/cloudinary.js";

// 🟢 CREATE
export const addBrand = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !req.file) {
      return res.status(400).json({ message: "Brand name and logo are required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: "brands",
    });

    const brand = await Brand.create({
      name,
      logoUrl: uploadResponse.secure_url,
    });

    res.status(201).json({ message: "Brand added successfully", brand });
  } catch (error) {
    console.error("Error adding brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🔵 READ
export const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ createdAt: -1 });
    res.status(200).json(brands);
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🟡 UPDATE
export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const brand = await Brand.findById(id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    // If new logo uploaded → replace on Cloudinary
    if (req.file) {
      // Delete old image (optional)
      const publicId = brand.logoUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`brands/${publicId}`);

      const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: "brands",
      });
      brand.logoUrl = uploadResponse.secure_url;
    }

    if (name) brand.name = name;
    await brand.save();

    res.status(200).json({ message: "Brand updated successfully", brand });
  } catch (error) {
    console.error("Error updating brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🔴 DELETE
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    // Delete image from Cloudinary
    const publicId = brand.logoUrl.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(`brands/${publicId}`);

    await brand.deleteOne();
    res.status(200).json({ message: "Brand deleted successfully" });
  } catch (error) {
    console.error("Error deleting brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
