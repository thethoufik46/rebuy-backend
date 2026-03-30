import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadPcBrand from "../middleware/uploadPcBrand.js";

import {
  addPcBrand,
  getPcBrands,
  updatePcBrand,
  deletePcBrand,
} from "../controllers/pc.brand.controller.js";

const router = express.Router();

router.post(
  "/add",
  verifyToken,
  uploadPcBrand.single("logo"),
  addPcBrand
);

router.get("/", getPcBrands);

router.put(
  "/:id",
  verifyToken,
  uploadPcBrand.single("logo"),
  updatePcBrand
);

router.delete(
  "/:id",
  verifyToken,
  deletePcBrand
);

export default router;