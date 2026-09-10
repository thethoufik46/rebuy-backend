// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import {verifyToken} from "../../../middleware/auth.js";
import uploadPcBrand from "../../../middleware/electronics/pc/uploadPcBrand.js";
import {addPcBrand,getPcBrands,updatePcBrand,deletePcBrand} from "../../../controllers/electronics/pc/pc.brand.controller.js";
const router=express.Router();
router.post("/add",verifyToken,uploadPcBrand.single("logo"),addPcBrand);
router.get("/",getPcBrands);
router.put("/:id",verifyToken,uploadPcBrand.single("logo"),updatePcBrand);
router.delete("/:id",verifyToken,deletePcBrand);
export default router;