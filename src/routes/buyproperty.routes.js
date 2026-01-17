import express from "express";
import {
  addBuyProperty,
  getMyBuyProperties,
  updateMyBuyProperty,
  deleteMyBuyProperty,
  getBuyProperties,
  getBuyPropertyById,
  updateBuyPropertyStatus,
  deleteBuyProperty,
} from "../controllers/buyproperty.controller.js";

import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   USER ROUTES
========================= */
router.post("/add", verifyToken, addBuyProperty);
router.get("/my", verifyToken, getMyBuyProperties);
router.put("/my/:id", verifyToken, updateMyBuyProperty);
router.delete("/my/:id", verifyToken, deleteMyBuyProperty);

/* =========================
   ADMIN ROUTES
========================= */
router.get("/", verifyToken, isAdmin, getBuyProperties);
router.get("/:id", verifyToken, isAdmin, getBuyPropertyById);
router.put("/:id/status", verifyToken, isAdmin, updateBuyPropertyStatus);
router.delete("/:id", verifyToken, isAdmin, deleteBuyProperty);

export default router;
