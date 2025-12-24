import express from "express";
import {
  addSellCar,
  getSellCars,
  getSellCarById,
  updateSellCarStatus,
  deleteSellCar,
} from "../controllers/sellcar.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   🟢 CREATE SELL CAR
   (LOGIN USER ONLY)
========================= */
router.post(
  "/add",
  verifyToken,   // ✅ login user required
  addSellCar
);

/* =========================
   🔵 GET ALL SELL CARS
   (Admin)
========================= */
router.get(
  "/",
  verifyToken,
  getSellCars
);

/* =========================
   🔵 GET SINGLE SELL CAR
========================= */
router.get(
  "/:id",
  verifyToken,
  getSellCarById
);

/* =========================
   🟡 UPDATE STATUS
   (Admin approve / reject)
========================= */
router.put(
  "/:id/status",
  verifyToken,
  updateSellCarStatus
);

/* =========================
   🔴 DELETE SELL CAR
   (Admin)
========================= */
router.delete(
  "/:id",
  verifyToken,
  deleteSellCar
);

export default router;
