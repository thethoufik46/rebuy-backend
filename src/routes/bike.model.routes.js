import express from "express";

import { verifyToken } from "../middleware/auth.js";
import uploadBikeModel from "../middleware/uploadBikeModel.js";

import {
  addBikeModel,
  getAllBikeModels,
  getBikeModelsByBrand,
  updateBikeModel,
  deleteBikeModel,
} from "../controllers/bike.model.controller.js";

const router = express.Router();

/* =====================================================
   PUBLIC
===================================================== */

router.get("/", getAllBikeModels);

router.get("/brand/:brandId", getBikeModelsByBrand);

/* =====================================================
   PROTECTED
===================================================== */

router.post(
  "/add",
  verifyToken,
  uploadBikeModel.single("image"),
  addBikeModel
);

router.put(
  "/:id",
  verifyToken,
  uploadBikeModel.single("image"),
  updateBikeModel
);

router.delete("/:id", verifyToken, deleteBikeModel);

export default router;