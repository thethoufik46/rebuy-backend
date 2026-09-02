// ======================= bike_brand.routes.js =======================

import express from "express";

import { verifyToken } from "../../../middleware/auth.js";

import uploadBikeBrand from "../../../middleware/bike/brand/uploadBikeBrand.js";

import {
  addBikeBrand,
  getBikeBrands,
  updateBikeBrand,
  deleteBikeBrand,
} from "../../../controllers/bike/brand/bike.brand.controller.js";

const router = express.Router();

// ============================================================
// GET ALL BIKE BRANDS
// ============================================================

router.get("/", getBikeBrands);

// ============================================================
// ADD BIKE BRAND
// ============================================================

router.post(
  "/add",
  verifyToken,
  uploadBikeBrand.single("logo"),
  addBikeBrand
);

// ============================================================
// UPDATE BIKE BRAND
// ============================================================

router.put(
  "/:id",
  verifyToken,
  uploadBikeBrand.single("logo"),
  updateBikeBrand
);

// ============================================================
// DELETE BIKE BRAND
// ============================================================

router.delete(
  "/:id",
  verifyToken,
  deleteBikeBrand
);

export default router;