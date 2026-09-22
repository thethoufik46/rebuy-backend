// ============================================================
// SLIDER ROUTES
// File:
// src/routes/slider/slider.routes.js
// ============================================================

import express from "express";

import { verifyToken } from "../../middleware/auth.js";

import uploadSlider from "../../middleware/slider/uploadSlider.js";

import {
  addSlider,
  getAllSliders,
  getSlidersByCategory,
  getSliderById,
  updateSlider,
  deleteSlider,
} from "../../controllers/slider/slider.controller.js";

const router = express.Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

router.get(
  "/",
  getAllSliders
);

router.get(
  "/category/:category",
  getSlidersByCategory
);

router.get(
  "/:id",
  getSliderById
);

// ============================================================
// PROTECTED ROUTES
// ============================================================

router.post(
  "/add",
  verifyToken,
  uploadSlider.single("image"),
  addSlider
);

router.put(
  "/:id",
  verifyToken,
  uploadSlider.single("image"),
  updateSlider
);

router.delete(
  "/:id",
  verifyToken,
  deleteSlider
);

export default router;