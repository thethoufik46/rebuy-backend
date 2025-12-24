// routes/bike.brand.route.js

import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import {
  addBikeBrand,
  getBikeBrands,
  updateBikeBrand,
  deleteBikeBrand,
} from "../controllers/bike.brand.controller.js";
import { verifyToken } from "../middleware/auth.js";
import BikeBrand from "../models/bike_brand_model.js"; // ✅ NEW

const router = express.Router();

/* =========================
   ☁️ CLOUDINARY STORAGE
========================= */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "bike-brands",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage });

/* =========================
   🟢 CREATE BIKE BRAND
========================= */
router.post(
  "/add",
  verifyToken,
  upload.single("logo"),
  addBikeBrand
);

/* =========================
   🔵 GET BIKE BRANDS (ADMIN / FULL)
========================= */
router.get(
  "/",
  getBikeBrands
);

/* =========================
   🔍 GET BIKE BRANDS (FILTER)
   👉 name + logoUrl only
========================= */
router.get("/filter", async (req, res) => {
  try {
    const brands = await BikeBrand.find(
      {},
      { name: 1, logoUrl: 1 } // ✅ filter fields
    ).sort({ name: 1 });

    res.status(200).json({
      success: true,
      brands,
    });
  } catch (error) {
    console.error("Bike brand filter error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* =========================
   🟡 UPDATE BIKE BRAND
========================= */
router.put(
  "/:id",
  verifyToken,
  upload.single("logo"),
  updateBikeBrand
);

/* =========================
   🔴 DELETE BIKE BRAND
========================= */
router.delete(
  "/:id",
  verifyToken,
  deleteBikeBrand
);

export default router;
