import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import Product from "../models/product_model.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

/* -------------------------------------------------
   ✅ Cloudinary Storage Setup
---------------------------------------------------*/
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "rebuy_uploads",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

/* -------------------------------------------------
   ✅ POST: Add Product (Admin Only)
   - Required: name, price, description, brand (Brand _id), image
---------------------------------------------------*/
router.post("/add", verifyToken, isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, price, description, brand } = req.body;

    if (!req.file?.path) {
      return res.status(400).json({ message: "No image uploaded" });
    }
    if (!brand) {
      return res.status(400).json({ message: "Brand ID is required" });
    }

    const product = new Product({
      name,
      price,
      description,
      imageUrl: req.file.path,
      brand, // 🔗 store ObjectId from Brand collection
    });

    await product.save();

    res.status(201).json({
      message: "✅ Product added successfully",
      product,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ message: "Error adding product", error });
  }
});

/* -------------------------------------------------
   ✅ GET: Fetch All Products (Public)
   - Includes brand name + logo (populate)
---------------------------------------------------*/
router.get("/", async (req, res) => {
  try {
    const products = await Product.find()
      .populate("brand", "name logoUrl")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "✅ All products fetched successfully",
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: "Error fetching products", error });
  }
});

/* -------------------------------------------------
   ✅ GET: Fetch Single Product by ID
---------------------------------------------------*/
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("brand", "name logoUrl");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "✅ Product fetched successfully",
      product,
    });
  } catch (error) {
    console.error("Fetch Single Error:", error);
    res.status(500).json({ message: "Error fetching product", error });
  }
});

/* -------------------------------------------------
   ✅ PUT: Update Product (Admin Only)
   - Optional image replacement & brand change
---------------------------------------------------*/
router.put("/:id", verifyToken, isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, price, description, brand } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 🖼️ If a new image uploaded → delete old one from Cloudinary
    if (req.file?.path) {
      const urlParts = product.imageUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const publicId = `rebuy_uploads/${fileName.split(".")[0]}`;

      await cloudinary.uploader.destroy(publicId);
      product.imageUrl = req.file.path;
    }

    // 📝 Update other fields
    product.name = name || product.name;
    product.price = price || product.price;
    product.description = description || product.description;
    product.brand = brand || product.brand;

    await product.save();

    res.status(200).json({
      message: "📝 Product updated successfully",
      updatedProduct: product,
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Error updating product", error });
  }
});

/* -------------------------------------------------
   ✅ DELETE: Remove Product + Cloudinary Image (Admin Only)
---------------------------------------------------*/
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 🖼️ Delete image from Cloudinary
    const urlParts = product.imageUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const publicId = `rebuy_uploads/${fileName.split(".")[0]}`;
    await cloudinary.uploader.destroy(publicId);

    // 🗑️ Delete from MongoDB
    await product.deleteOne();

    res.status(200).json({
      message: "🗑️ Product and image deleted successfully",
      deletedProduct: product,
    });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Error deleting product", error });
  }
});

export default router;
