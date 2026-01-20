// ======================= car_brand.routes.js =======================
// C:\flutter_projects\rebuy-backend\src\routes\car_brand.routes.js

import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadCarBrand from "../middleware/uploadCarbrand.js";

import {
  addBrand,
  getBrands,
  updateBrand,
  deleteBrand,
} from "../controllers/car.brand.controller.js";

const router = express.Router();

router.post(
  "/add",
  verifyToken,
  uploadCarBrand.single("logo"),
  addBrand
);

router.get("/", getBrands);

router.put(
  "/:id",
  verifyToken,
  uploadCarBrand.single("logo"),
  updateBrand
);

router.delete(
  "/:id",
  verifyToken,
  deleteBrand
);

export default router;
