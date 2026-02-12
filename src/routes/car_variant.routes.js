import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadCarVariant from "../middleware/uploadCarVariant.js";

import {
  addVariant,
  getAllVariants,
  getVariantsByBrand,
  updateVariant,
  deleteVariant,

  /// ✅ ADD THESE
  getONEBrandhideVariants,
  getLoadVehiclesVariants,

} from "../controllers/car.variant.controller.js";

const router = express.Router();

/* =====================================================
   ADD VARIANT
===================================================== */
router.post(
  "/add",
  verifyToken,
  uploadCarVariant.single("image"),
  addVariant
);

/* =====================================================
   GET ALL VARIANTS
===================================================== */
router.get("/", getAllVariants);

/* =====================================================
   GET ONE BRAND HIDE VARIANTS ✅
===================================================== */
router.get("/visible", getONEBrandhideVariants);

/* =====================================================
   GET LOAD VEHICLES VARIANTS ONLY ✅
===================================================== */
router.get("/load-vehicles", getLoadVehiclesVariants);

/* =====================================================
   GET VARIANTS BY BRAND
===================================================== */
router.get("/brand/:brandId", getVariantsByBrand);

/* =====================================================
   UPDATE VARIANT
===================================================== */
router.put(
  "/:id",
  verifyToken,
  uploadCarVariant.single("image"),
  updateVariant
);

/* =====================================================
   DELETE VARIANT
===================================================== */
router.delete("/:id", verifyToken, deleteVariant);

export default router;
