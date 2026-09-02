// ======================= car.variant.routes.js =======================

import express from "express";

import {
  verifyToken,
} from "../../../middleware/auth.js";

import uploadCarVariant from
  "../../../middleware/car/variant/uploadCarVariant.js";

import {
  addCarVariant,
  getAllCarVariants,
  getCarVariantsByModel,
  updateCarVariant,
  deleteCarVariant,
  getSelectedCarVariants,
} from "../../../controllers/car/variant/car.variant.controller.js";

const router =
  express.Router();

// ============================================================
// PUBLIC ROUTES 🚀
// ============================================================

// GET ALL CAR VARIANTS
// GET /carvariants

router.get(
  "/",
  getAllCarVariants
);

// GET SELECTED CAR VARIANTS
// GET /carvariants/selected

router.get(
  "/selected",
  getSelectedCarVariants
);

// GET CAR VARIANTS BY CAR MODEL
// GET /carvariants/model/:carModelId

router.get(
  "/model/:carModelId",
  getCarVariantsByModel
);

// ============================================================
// PROTECTED ROUTES 🔒
// ============================================================

// ADD CAR VARIANT
// POST /carvariants/add

router.post(
  "/add",
  verifyToken,
  uploadCarVariant.single(
    "image"
  ),
  addCarVariant
);

// UPDATE CAR VARIANT
// PUT /carvariants/:id

router.put(
  "/:id",
  verifyToken,
  uploadCarVariant.single(
    "image"
  ),
  updateCarVariant
);

// DELETE CAR VARIANT
// DELETE /carvariants/:id

router.delete(
  "/:id",
  verifyToken,
  deleteCarVariant
);

export default router;