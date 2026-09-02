// ======================= bike.variant.routes.js =======================

import express from "express";

import { verifyToken } from "../../../middleware/auth.js";

import uploadBikeVariant from "../../../middleware/bike/variant/uploadBikeVariant.js";

import {
  addBikeVariant,
  getBikeVariants,
  getBikeVariantsByModel,
  updateBikeVariant,
  deleteBikeVariant,
} from "../../../controllers/bike/variant/bike.variant.controller.js";

const router = express.Router();

// ============================================================
// GET ALL BIKE VARIANTS
// ============================================================

router.get(
  "/",
  getBikeVariants
);

// ============================================================
// GET BIKE VARIANTS BY BIKE MODEL
// ============================================================

router.get(
  "/model/:modelId",
  getBikeVariantsByModel
);

// ============================================================
// ADD BIKE VARIANT
// ============================================================

router.post(
  "/add",
  verifyToken,
  uploadBikeVariant.single("image"),
  addBikeVariant
);

// ============================================================
// UPDATE BIKE VARIANT
// ============================================================

router.put(
  "/:id",
  verifyToken,
  uploadBikeVariant.single("image"),
  updateBikeVariant
);

// ============================================================
// DELETE BIKE VARIANT
// ============================================================

router.delete(
  "/:id",
  verifyToken,
  deleteBikeVariant
);

export default router;