// ============================================================
// MOBILE BRAND ROUTES
// File:
// src/routes/mobile_brand.routes.js
// ============================================================

import express from "express";

import { verifyToken } from "../middleware/auth.js";

import uploadMobileBrand from "../middleware/uploadMobileBrand.js";

import {
  addMobileBrand,
  getMobileBrands,
  updateMobileBrand,
  deleteMobileBrand,
} from "../controllers/mobile.brand.controller.js";

const router = express.Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// GET ALL MOBILE BRANDS
// GET /api/mobile-brands
router.get(
  "/",
  getMobileBrands
);

// ============================================================
// PROTECTED ROUTES
// ============================================================

// ADD MOBILE BRAND
// POST /api/mobile-brands/add
router.post(
  "/add",
  verifyToken,
  uploadMobileBrand.single("logo"),
  addMobileBrand
);

// UPDATE MOBILE BRAND
// PUT /api/mobile-brands/:id
router.put(
  "/:id",
  verifyToken,
  uploadMobileBrand.single("logo"),
  updateMobileBrand
);

// DELETE MOBILE BRAND
// DELETE /api/mobile-brands/:id
router.delete(
  "/:id",
  verifyToken,
  deleteMobileBrand
);

// ============================================================
// EXPORT
// ============================================================

export default router;