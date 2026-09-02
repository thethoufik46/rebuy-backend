// ======================= bike.model.routes.js =======================

import express from "express";

import { verifyToken } from "../../../middleware/auth.js";

import uploadBikeModel from "../../../middleware/bike/model/uploadBikeModel.js";

import {
  addBikeModel,
  getBikeModels,
  getBikeModelsByBrand,
  updateBikeModel,
  deleteBikeModel,
} from "../../../controllers/bike/model/bike.model.controller.js";

const router = express.Router();

// ============================================================
// GET ALL BIKE MODELS
// ============================================================

router.get("/", getBikeModels);

// ============================================================
// GET BIKE MODELS BY BRAND
// ============================================================

router.get(
  "/brand/:brandId",
  getBikeModelsByBrand
);

// ============================================================
// ADD BIKE MODEL
// ============================================================

router.post(
  "/add",
  verifyToken,
  uploadBikeModel.single("image"),
  addBikeModel
);

// ============================================================
// UPDATE BIKE MODEL
// ============================================================

router.put(
  "/:id",
  verifyToken,
  uploadBikeModel.single("image"),
  updateBikeModel
);

// ============================================================
// DELETE BIKE MODEL
// ============================================================

router.delete(
  "/:id",
  verifyToken,
  deleteBikeModel
);

export default router;