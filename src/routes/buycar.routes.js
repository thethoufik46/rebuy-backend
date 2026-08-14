// ======================= buycar.routes.js =======================

import express from "express";

import {
  addBuyCar,
  getMyBuyCars,
  updateMyBuyCar,
  deleteMyBuyCar,
  restoreMyBuyCar,

  getBuyCars,
  getBuyCarById,
  updateBuyCarStatus,
  deleteBuyCar,
} from "../controllers/buycar.controller.js";

import {
  verifyToken,
  isAdmin,
} from "../middleware/auth.js";

const router =
  express.Router();

/* ============================================================
   USER ROUTES
============================================================ */

/* ADD */
router.post(
  "/add",
  verifyToken,
  addBuyCar
);

/* MY REQUESTS */
router.get(
  "/my",
  verifyToken,
  getMyBuyCars
);

/* RESTORE
   MUST COME BEFORE /:id
*/
router.put(
  "/my/:id/restore",
  verifyToken,
  restoreMyBuyCar
);

/* UPDATE MY REQUEST */
router.put(
  "/my/:id",
  verifyToken,
  updateMyBuyCar
);

/* SOFT DELETE MY REQUEST */
router.delete(
  "/my/:id",
  verifyToken,
  deleteMyBuyCar
);

/* ============================================================
   ADMIN ROUTES
============================================================ */

router.get(
  "/",
  verifyToken,
  isAdmin,
  getBuyCars
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