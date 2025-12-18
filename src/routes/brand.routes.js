import express from "express";
import multer from "multer";
import {
  addBrand,
  getBrands,
  updateBrand,
  deleteBrand,
} from "../controllers/brand.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// CREATE
router.post("/add", verifyToken, upload.single("logo"), addBrand);

// READ
router.get("/", getBrands);

// UPDATE
router.put("/:id", verifyToken, upload.single("logo"), updateBrand);

// DELETE
router.delete("/:id", verifyToken, deleteBrand);

export default router;
