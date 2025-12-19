import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import {
  addBrand,
  getBrands,
  updateBrand,
  deleteBrand,
} from "../controllers/brand.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* ☁️ Cloudinary Storage (NO local uploads) */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "brands",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage });

// CREATE BRAND
router.post("/add", verifyToken, upload.single("logo"), addBrand);

// READ BRANDS
router.get("/", getBrands);

// UPDATE BRAND
router.put("/:id", verifyToken, upload.single("logo"), updateBrand);

// DELETE BRAND
router.delete("/:id", verifyToken, deleteBrand);

export default router;
