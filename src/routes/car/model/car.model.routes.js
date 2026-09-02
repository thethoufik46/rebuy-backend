// ======================= car.model.routes.js =======================

import express from "express";

import {
  verifyToken,
} from "../../../middleware/auth.js";

import uploadCarModel from
  "../../../middleware/car/model/uploadCarModel.js";

import {
  addCarModel,
  getAllCarModels,
  getCarModelsByBrand,
  getONEBrandhideCarModels,
  getLoadVehiclesCarModels,
  getOtherStateCarModels,
  getSelectedCarModels,
  updateCarModel,
  deleteCarModel,
} from "../../../controllers/car/model/car.model.controller.js";

const router =
  express.Router();

// ============================================================
// PUBLIC ROUTES 🚀
// ============================================================

// GET ALL CAR MODELS
// GET /carmodels

router.get(
  "/",
  getAllCarModels
);

// GET VISIBLE CAR MODELS
// GET /carmodels/visible

router.get(
  "/visible",
  getONEBrandhideCarModels
);

// GET LOAD VEHICLES CAR MODELS
// GET /carmodels/load-vehicles

router.get(
  "/load-vehicles",
  getLoadVehiclesCarModels
);

// GET OTHER STATE CAR MODELS
// GET /carmodels/other-state

router.get(
  "/other-state",
  getOtherStateCarModels
);

// GET SELECTED CAR MODELS
// GET /carmodels/selected

router.get(
  "/selected",
  getSelectedCarModels
);

// GET CAR MODELS BY BRAND
// GET /carmodels/brand/:brandId

router.get(
  "/brand/:brandId",
  getCarModelsByBrand
);

// ============================================================
// PROTECTED ROUTES 🔒
// ============================================================

// ADD CAR MODEL
// POST /carmodels/add

router.post(
  "/add",
  verifyToken,
  uploadCarModel.single(
    "image"
  ),
  addCarModel
);

// UPDATE CAR MODEL
// PUT /carmodels/:id

router.put(
  "/:id",
  verifyToken,
  uploadCarModel.single(
    "image"
  ),
  updateCarModel
);

// DELETE CAR MODEL
// DELETE /carmodels/:id

router.delete(
  "/:id",
  verifyToken,
  deleteCarModel
);

export default router;