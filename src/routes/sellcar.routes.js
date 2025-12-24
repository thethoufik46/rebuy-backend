// ======================= sellcar.routes.js =======================
import express from "express";
import {
  addSellCar,
  getMySellCars,
  updateMySellCar,
  deleteMySellCar,
  getSellCars,
  getSellCarById,
  updateSellCarStatus,
  deleteSellCar,
} from "../controllers/sellcar.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { uploadSingle } from "../middleware/upload.js";

const router = express.Router();

/* =========================
   USER ROUTES
========================= */
router.post("/add", verifyToken, uploadSingle, addSellCar);
router.get("/my", verifyToken, getMySellCars);
router.put("/my/:id", verifyToken, uploadSingle, updateMySellCar);
router.delete("/my/:id", verifyToken, deleteMySellCar);

/* =========================
   ADMIN ROUTES
========================= */
router.get("/", verifyToken, isAdmin, getSellCars);
router.get("/:id", verifyToken, isAdmin, getSellCarById);
router.put("/:id/status", verifyToken, isAdmin, updateSellCarStatus);
router.delete("/:id", verifyToken, isAdmin, deleteSellCar);

export default router;
