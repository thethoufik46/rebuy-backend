// ======================= bike_brand.routes.js =======================

import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadBikeBrand from "../middleware/uploadBikeBrand.js";

import {
  addBikeBrand,
  getBikeBrands,
  updateBikeBrand,
  deleteBikeBrand,
} from "../controllers/bike.brand.controller.js";

const router = express.Router();

router.post(
  "/add",
  verifyToken,
  uploadBikeBrand.single("logo"),
  addBikeBrand
);

router.get("/", getBikeBrands);

router.put(
  "/:id",
  verifyToken,
  uploadBikeBrand.single("logo"),
  updateBikeBrand
);

router.delete(
  "/:id",
  verifyToken,
  deleteBikeBrand
);

export default router;
