import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadCarBrand from "../middleware/uploadCarbrand.js";

import {
  addMobileBrand,
  getMobileBrands,
  updateMobileBrand,
  deleteMobileBrand,
} from "../controllers/mobile.brand.controller.js";

const router = express.Router();

router.post(
  "/add",
  verifyToken,
  uploadCarBrand.single("logo"),
  addMobileBrand
);

router.get("/", getMobileBrands);

router.put(
  "/:id",
  verifyToken,
  uploadCarBrand.single("logo"),
  updateMobileBrand
);

router.delete(
  "/:id",
  verifyToken,
  deleteMobileBrand
);

export default router;