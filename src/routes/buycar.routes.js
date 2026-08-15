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

const router = express.Router();

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

/*
  RESTORE

  IMPORTANT:
  Must be BEFORE /my/:id
*/
router.put(
  "/my/:id/restore",
  verifyToken,
  restoreMyBuyCar
);

/* UPDATE */
router.put(
  "/my/:id",
  verifyToken,
  updateMyBuyCar
);

/*
  SOFT DELETE

  This NEVER permanently deletes immediately.

  It sets:

  isDeleted = true
  deletedAt = now
  deleteExpiresAt = now + 24 hours
*/
router.delete(
  "/my/:id",
  verifyToken,
  deleteMyBuyCar
);


/* ============================================================
   ADMIN ROUTES
============================================================ */

/* GET ACTIVE REQUESTS */
router.get(
  "/",
  verifyToken,
  isAdmin,
  getBuyCars
);

/* GET SINGLE */
router.get(
  "/:id",
  verifyToken,
  isAdmin,
  getBuyCarById
);

/* UPDATE STATUS */
router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  updateBuyCarStatus
);

/*
  ADMIN PERMANENT DELETE
*/
router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  deleteBuyCar
);

export default router;