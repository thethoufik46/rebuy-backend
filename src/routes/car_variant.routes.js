import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadCarVariant from "../middleware/uploadCarVariant.js";

import {
  addVariant,
  getVariantsByBrand,
  deleteVariant,
} from "../controllers/car.variant.controller.js";

const router = express.Router();

// ADD VARIANT
router.post(
  "/add",
  verifyToken,
  uploadCarVariant.single("image"),
  addVariant
);

// GET VARIANTS BY BRAND
router.get("/brand/:brandId", getVariantsByBrand);

// DELETE VARIANT
router.delete("/:id", verifyToken, deleteVariant);

export default router;
