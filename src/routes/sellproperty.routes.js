// ======================= routes/sellproperty.routes.js =======================
import express from "express";
import {
  addSellProperty,
  getMySellProperties,
  updateMySellProperty,
  deleteMySellProperty,
  getSellProperties,
  getSellPropertyById,
  updateSellPropertyStatus,
  deleteSellProperty,
} from "../controllers/sellproperty.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { uploadSingle } from "../middleware/upload.js";

const router = express.Router();

/* USER */
router.post("/add", verifyToken, uploadSingle, addSellProperty);
router.get("/my", verifyToken, getMySellProperties);
router.put("/my/:id", verifyToken, uploadSingle, updateMySellProperty);
router.delete("/my/:id", verifyToken, deleteMySellProperty);

/* ADMIN */
router.get("/", verifyToken, isAdmin, getSellProperties);
router.get("/:id", verifyToken, isAdmin, getSellPropertyById);
router.put("/:id/status", verifyToken, isAdmin, updateSellPropertyStatus);
router.delete("/:id", verifyToken, isAdmin, deleteSellProperty);

export default router;
