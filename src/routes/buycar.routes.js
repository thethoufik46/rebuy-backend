import express from "express";
import {
  addBuyCar,
  getMyBuyCars,
  updateMyBuyCar,
  deleteMyBuyCar,
  getBuyCars,
  getBuyCarById,
  updateBuyCarStatus,
  deleteBuyCar,
} from "../controllers/buycar.controller.js";

import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   USER ROUTES
========================= */
router.post("/add", verifyToken, addBuyCar);
router.get("/my", verifyToken, getMyBuyCars);
router.put("/my/:id", verifyToken, updateMyBuyCar);
router.delete("/my/:id", verifyToken, deleteMyBuyCar);

/* =========================
   ADMIN ROUTES
========================= */
router.get("/", verifyToken, isAdmin, getBuyCars);
router.get("/:id", verifyToken, isAdmin, getBuyCarById);
router.put("/:id/status", verifyToken, isAdmin, updateBuyCarStatus);
router.delete("/:id", verifyToken, isAdmin, deleteBuyCar);

export default router;
