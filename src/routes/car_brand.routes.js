// ======================= car_brand.routes.js =======================
// C:\flutter_projects\rebuy-backend\src\routes\car_brand.routes.js

import express from "express";

import { verifyToken } from "../middleware/auth.js";

import uploadCarBrand from "../middleware/uploadCarbrand.js";

import {
  addBrand,
  getBrands,
  updateBrand,
  deleteBrand,
} from "../controllers/car.brand.controller.js";

const router = express.Router();

// =====================================================
// ADD CAR BRAND
// =====================================================

router.post(
  "/add",
  verifyToken,
  uploadCarBrand.single("logo"),
  addBrand
);

// =====================================================
// GET CAR BRANDS
// =====================================================

router.get(
  "/",
  getBrands
);

// =====================================================
// UPDATE CAR BRAND
// =====================================================

router.put(
  "/:id",
  verifyToken,
  uploadCarBrand.single("logo"),
  updateBrand
);

// =====================================================
// DELETE CAR BRAND
// =====================================================

router.delete(
  "/:id",
  verifyToken,
  deleteBrand
);

export default router;