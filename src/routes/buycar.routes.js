// ======================= buycar.routes.js =======================

import express from "express";

import {
  addBuyCar,
  getMyBuyCars,
  getMyDeletedBuyCars,
  updateMyBuyCar,
  deleteMyBuyCar,
  restoreMyBuyCar,

  getBuyCars,
  getBuyCarById,
  updateBuyCarStatus,
  deleteBuyCar,
  getDeletedBuyCars,
} from "../controllers/buycar.controller.js";

import {
  verifyToken,
  isAdmin,
} from "../middleware/auth.js";

import uploadBuyCar from "../middleware/uploadBuyCar.js";

const router = express.Router();

/* =====================================================
   USER
===================================================== */

router.post(
  "/add",
  verifyToken,
  uploadBuyCar.single("audio"),
  addBuyCar
);

router.get(
  "/my",
  verifyToken,
  getMyBuyCars
);

router.get(
  "/my/deleted",
  verifyToken,
  getMyDeletedBuyCars
);

router.put(
  "/my/:id",
  verifyToken,
  uploadBuyCar.single("audio"),
  updateMyBuyCar
);

router.delete(
  "/my/:id",
  verifyToken,
  deleteMyBuyCar
);

router.put(
  "/my/:id/restore",
  verifyToken,
  restoreMyBuyCar
);

/* =====================================================
   ADMIN
===================================================== */

router.get(
  "/",
  verifyToken,
  isAdmin,
  getBuyCars
);

router.get(
  "/deleted",
  verifyToken,
  isAdmin,
  getDeletedBuyCars
);

router.get(
  "/:id",
  verifyToken,
  isAdmin,
  getBuyCarById
);

router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  updateBuyCarStatus
);

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  deleteBuyCar
);

export default router;