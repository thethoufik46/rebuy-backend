// ============================================================
// CAR BRAND ROUTES
// File:
// src/routes/car/brand/car.brand.routes.js
// ============================================================
import express from "express";
import { verifyToken } from "../../../middleware/auth.js";
import uploadCarBrand from "../../../middleware/car/brand/uploadCarBrand.js";
import { addCarBrand, getAllCarBrands, getCarBrandById, updateCarBrand, deleteCarBrand } from "../../../controllers/car/brand/car.brand.controller.js";
const router = express.Router();
router.get("/", getAllCarBrands);
router.get("/:id", getCarBrandById);
router.post("/add", verifyToken, uploadCarBrand.single("logo"), addCarBrand);
router.put("/:id", verifyToken, uploadCarBrand.single("logo"), updateCarBrand);
router.delete("/:id", verifyToken, deleteCarBrand);
export default router;