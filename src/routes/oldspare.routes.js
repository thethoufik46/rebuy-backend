// ============================================================
// oldspare.routes.js
// FINAL FULL CODE
// ============================================================

import express from "express";

import {
  addOldSpare,
  getMyOldSpares,
  getMyOldSpareById,
  updateMyOldSpare,
  deleteMyOldSpare,
  restoreMyOldSpare,
  getOldSpares,
  getOldSpareById,
  updateOldSpareStatus,
  deleteOldSpare,
} from "../controllers/oldspare.controller.js";

import {
  verifyToken,
  isAdmin,
} from "../middleware/auth.js";

import uploadOldSpare from "../middleware/uploadOldSpare.js";

const router = express.Router();

// ============================================================
// USER ROUTES
// ============================================================

// ------------------------------------------------------------
// ADD OLD SPARE WANT
// ------------------------------------------------------------
// multipart/form-data
//
// spareName
// category
// description
// image = oldSpareImage
// ------------------------------------------------------------

router.post(
  "/add",
  verifyToken,
  uploadOldSpare.single("oldSpareImage"),
  addOldSpare
);

// ------------------------------------------------------------
// GET MY OLD SPARES
// ------------------------------------------------------------

router.get(
  "/my",
  verifyToken,
  getMyOldSpares
);

// ------------------------------------------------------------
// RESTORE MY OLD SPARE
//
// IMPORTANT:
// Must be BEFORE /my/:id
// ------------------------------------------------------------

router.put(
  "/my/:id/restore",
  verifyToken,
  restoreMyOldSpare
);

// ------------------------------------------------------------
// GET MY SINGLE OLD SPARE
// ------------------------------------------------------------

router.get(
  "/my/:id",
  verifyToken,
  getMyOldSpareById
);

// ------------------------------------------------------------
// UPDATE MY OLD SPARE
// ------------------------------------------------------------

router.put(
  "/my/:id",
  verifyToken,
  uploadOldSpare.single("oldSpareImage"),
  updateMyOldSpare
);

// ------------------------------------------------------------
// DELETE MY OLD SPARE
// ------------------------------------------------------------

router.delete(
  "/my/:id",
  verifyToken,
  deleteMyOldSpare
);

// ============================================================
// ADMIN ROUTES
// ============================================================

// ------------------------------------------------------------
// GET ALL OLD SPARES
//
// Optional:
//
// ?category=car
// ?category=bike
// ?category=load_vehicle
//
// ?status=pending
// ?status=approved
// ?status=rejected
// ------------------------------------------------------------

router.get(
  "/",
  verifyToken,
  isAdmin,
  getOldSpares
);

// ------------------------------------------------------------
// GET SINGLE OLD SPARE
// ------------------------------------------------------------

router.get(
  "/:id",
  verifyToken,
  isAdmin,
  getOldSpareById
);

// ------------------------------------------------------------
// UPDATE STATUS
// ------------------------------------------------------------

router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  updateOldSpareStatus
);

// ------------------------------------------------------------
// ADMIN PERMANENT DELETE
// ------------------------------------------------------------

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  deleteOldSpare
);

// ============================================================
// EXPORT
// ============================================================

export default router;