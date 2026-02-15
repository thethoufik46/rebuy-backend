import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadCarVariant from "../middleware/uploadCarVariant.js";

import {
  addVariant,
  getAllVariants,
  getVariantsByBrand,
  updateVariant,
  deleteVariant,
  getONEBrandhideVariants,
  getLoadVehiclesVariants,
  getOtherStateVariants,
  getSelectedVariants, // ✅ ADD THIS
} from "../controllers/car.variant.controller.js";

const router = express.Router();

/* =====================================================
   PUBLIC ROUTES 🚀
===================================================== */

router.get("/", getAllVariants);

router.get("/visible", getONEBrandhideVariants);

router.get("/load-vehicles", getLoadVehiclesVariants);

router.get("/other-state", getOtherStateVariants);

router.get("/selected", getSelectedVariants); // ✅ NEW ROUTE 🔥

router.get("/brand/:brandId", getVariantsByBrand);

/* =====================================================
   PROTECTED ROUTES 🔒
===================================================== */

router.post(
  "/add",
  verifyToken,
  uploadCarVariant.single("image"),
  addVariant
);

router.put(
  "/:id",
  verifyToken,
  uploadCarVariant.single("image"),
  updateVariant
);

router.delete("/:id", verifyToken, deleteVariant);

export default router;
