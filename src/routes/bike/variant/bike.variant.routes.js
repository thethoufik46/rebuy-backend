// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import express from "express";
import { verifyToken } from "../../../middleware/auth.js";
import uploadBikeVariant from "../../../middleware/bike/variant/uploadBikeVariant.js";
import {
  addBikeVariant,
  getBikeVariants,
  getBikeVariantsByModel,
  updateBikeVariant,
  deleteBikeVariant,
} from "../../../controllers/bike/variant/bike.variant.controller.js";
const router = express.Router();
router.get(
  "/",
  getBikeVariants
);
router.get(
  "/model/:modelId",
  getBikeVariantsByModel
);
router.post(
  "/add",
  verifyToken,
  uploadBikeVariant.single(
    "image"
  ),
  addBikeVariant
);
router.put(
  "/:id",
  verifyToken,
  uploadBikeVariant.single(
    "image"
  ),
  updateBikeVariant
);
router.delete(
  "/:id",
  verifyToken,
  deleteBikeVariant
);
export default router;