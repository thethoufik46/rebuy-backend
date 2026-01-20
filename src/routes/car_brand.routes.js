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

/* =========================
   CREATE BRAND
========================= */
router.post(
  "/add",
  verifyToken,
  uploadCarBrand.single("logo"),
  addBrand
);

/* =========================
   GET BRANDS
========================= */
router.get("/", getBrands);

/* =========================
   UPDATE BRAND
========================= */
router.put(
  "/:id",
  verifyToken,
  uploadCarBrand.single("logo"),
  updateBrand
);

/* =========================
   DELETE BRAND
========================= */
router.delete(
  "/:id",
  verifyToken,
  deleteBrand
);

export default router;
