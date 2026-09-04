// ============================================================
// CAR BRAND ROUTES
// File:
// src/routes/car/brand/car.brand.routes.js
// ============================================================

import express from "express";

import { verifyToken } from "../../../middleware/auth.js";

// IMPORTANT:
// Actual middleware filename:
// uploadCarbrand.js
import uploadCarBrand from "../../../middleware/car/brand/uploadCarbrand.js";

import {
  addCarBrand,
  getAllCarBrands,
  getCarBrandById,
  updateCarBrand,
  deleteCarBrand,
} from "../../../controllers/car/brand/car.brand.controller.js";

const router = express.Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// GET ALL CAR BRANDS
// GET /api/carbrands
router.get(
  "/",
  getAllCarBrands
);

// GET SINGLE CAR BRAND
// GET /api/carbrands/:id
router.get(
  "/:id",
  getCarBrandById
);

// ============================================================
// PROTECTED ROUTES
// ============================================================

// ADD CAR BRAND
// POST /api/carbrands/add
router.post(
  "/add",
  verifyToken,
  uploadCarBrand.single("logo"),
  addCarBrand
);

// UPDATE CAR BRAND
// PUT /api/carbrands/:id
router.put(
  "/:id",
  verifyToken,
  uploadCarBrand.single("logo"),
  updateCarBrand
);

// DELETE CAR BRAND
// DELETE /api/carbrands/:id
router.delete(
  "/:id",
  verifyToken,
  deleteCarBrand
);

// ============================================================
// EXPORT
// ============================================================

export default router;