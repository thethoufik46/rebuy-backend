import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadLaptopBrand from "../middleware/uploadLaptopBrand.js";

import {
  addLaptopBrand,
  getLaptopBrands,
  updateLaptopBrand,
  deleteLaptopBrand,
} from "../controllers/laptop.brand.controller.js";

const router = express.Router();

router.post(
  "/add",
  verifyToken,
  uploadLaptopBrand.single("logo"),
  addLaptopBrand
);

router.get("/", getLaptopBrands);

router.put(
  "/:id",
  verifyToken,
  uploadLaptopBrand.single("logo"),
  updateLaptopBrand
);

router.delete(
  "/:id",
  verifyToken,
  deleteLaptopBrand
);

export default router;