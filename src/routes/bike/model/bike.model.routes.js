// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import express from "express";
import { verifyToken } from "../../../middleware/auth.js";
import uploadBikeModel from "../../../middleware/bike/model/uploadBikeModel.js";
import {
  addBikeModel,
  getAllBikeModels,
  getBikeModelsByBrand,
  getONEBrandhideBikeModels,
  getLoadVehiclesBikeModels,
  getOtherStateBikeModels,
  getSelectedBikeModels,
  updateBikeModel,
  deleteBikeModel,
} from "../../../controllers/bike/model/bike.model.controller.js";
const router = express.Router();
router.get(
  "/",
  getAllBikeModels
);
router.get(
  "/visible",
  getONEBrandhideBikeModels
);
router.get(
  "/load-vehicles",
  getLoadVehiclesBikeModels
);
router.get(
  "/other-state",
  getOtherStateBikeModels
);
router.get(
  "/selected",
  getSelectedBikeModels
);
router.get(
  "/brand/:brandId",
  getBikeModelsByBrand
);
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
router.delete(
  "/:id",
  verifyToken,
  deleteBikeModel
);
export default router;