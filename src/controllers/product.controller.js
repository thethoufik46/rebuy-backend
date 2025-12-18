import Product from "../models/product.model.js";
import { uploadToFirebase } from "../services/firebaseUpload.js";

export const addProduct = async (req, res) => {
  try {
    const { name, price, description, brand } = req.body; // ✅ include brand
    const image = req.file;

    if (!image) {
      return res.status(400).json({ message: "No image provided" });
    }
    if (!brand) {
      return res.status(400).json({ message: "Brand ID is required" });
    }

    // ✅ Upload image to Firebase
    const imageUrl = await uploadToFirebase(
      image.buffer,
      image.originalname,
      image.mimetype
    );

    // ✅ Create product in MongoDB
    const product = new Product({
      name,
      price,
      description,
      imageUrl,
      brand, // 🔗 store brand ObjectId
    });

    await product.save();

    res.status(201).json({
      message: "✅ Product added successfully",
      product,
    });
  } catch (error) {
    console.error("❌ Add Product Error:", error);
    res.status(500).json({ message: error.message });
  }
};
