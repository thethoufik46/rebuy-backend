// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import {verifyToken} from "../../../middleware/auth.js";
import uploadMobileBrand from "../../../middleware/electronics/mobile/uploadMobileBrand.js";
import {addMobileBrand,getMobileBrands,updateMobileBrand,deleteMobileBrand} from "../../../controllers/electronics/mobile/mobile.brand.controller.js";
const router=express.Router();
router.post("/add",verifyToken,uploadMobileBrand.single("logo"),addMobileBrand);
router.get("/",getMobileBrands);
router.put("/:id",verifyToken,uploadMobileBrand.single("logo"),updateMobileBrand);
router.delete("/:id",verifyToken,deleteMobileBrand);
export default router;