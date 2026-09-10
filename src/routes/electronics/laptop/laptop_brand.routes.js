// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";
import {verifyToken} from "../../../middleware/auth.js";
import uploadLaptopBrand from "../../../middleware/electronics/laptop/uploadLaptopBrand.js";
import {addLaptopBrand,getLaptopBrands,updateLaptopBrand,deleteLaptopBrand} from "../../../controllers/electronics/laptop/laptop.brand.controller.js";
const router=express.Router();
router.post("/add",verifyToken,uploadLaptopBrand.single("logo"),addLaptopBrand);
router.get("/",getLaptopBrands);
router.put("/:id",verifyToken,uploadLaptopBrand.single("logo"),updateLaptopBrand);
router.delete("/:id",verifyToken,deleteLaptopBrand);
export default router;