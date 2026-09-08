// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import express from "express";
import { verifyToken } from "../../../middleware/auth.js";
import uploadBikeBrand from "../../../middleware/bike/brand/uploadBikeBrand.js";
import {
  addBikeBrand,
  getBikeBrands,
  getBikeBrandById,
  updateBikeBrand,
  deleteBikeBrand,
} from "../../../controllers/bike/brand/bike.brand.controller.js";
const router = express.Router();
router.get("/", getBikeBrands);
router.get("/:id", getBikeBrandById);
router.post(
  "/add",
  verifyToken,
  uploadBikeBrand.single("logo"),
  addBikeBrand
);
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