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
   🔵 GET BIKE BRANDS
========================= */
router.get(
  "/",
  getBikeBrands
);

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
