// ======================= sellproperty.routes.js =======================

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
import uploadProperty from "../middleware/uploadProperty.js";

const router = express.Router();

/* ======================
   USER ROUTES
====================== */
router.post(
  "/add",
  verifyToken,
  uploadProperty.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  addSellProperty
);

router.get("/my", verifyToken, getMySellProperties);

router.put(
  "/my/:id",
  verifyToken,
  uploadProperty.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  updateMySellProperty
);

router.delete("/my/:id", verifyToken, deleteMySellProperty);

/* ======================
   ADMIN ROUTES
====================== */
router.get("/", verifyToken, isAdmin, getSellProperties);
router.get("/:id", verifyToken, isAdmin, getSellPropertyById);
router.put("/:id/status", verifyToken, isAdmin, updateSellPropertyStatus);
router.delete("/:id", verifyToken, isAdmin, deleteSellProperty);

export default router;
