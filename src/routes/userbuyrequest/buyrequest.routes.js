// ============================================================
// buyrequest.routes.js
// FINAL FULL CODE
// ============================================================

import express from "express";

import {
  addBuyRequest,
  getMyBuyRequests,
  updateMyBuyRequest,
  deleteMyBuyRequest,
  restoreMyBuyRequest,
  getBuyRequests,
  getBuyRequestById,
  updateBuyRequestStatus,
  deleteBuyRequest,
} from "../../controllers/userbuyrequest/buyrequest.controller.js";

import {
  verifyToken,
  isAdmin,
} from "../../middleware/auth.js";

import uploadBuyRequest from "../../middleware/userbuyrequest/uploadBuyRequest.js";
const router = express.Router();


// ============================================================
// USER ROUTES
// ============================================================


// ------------------------------------------------------------
// ADD BUY REQUEST
//
// Flutter sends multipart/form-data.
//
// audio field:
// optional
// ------------------------------------------------------------

router.post(
  "/add",
  verifyToken,
  uploadBuyRequest.single("audio"),
  addBuyRequest
);


// ------------------------------------------------------------
// GET MY BUY REQUESTS
// ------------------------------------------------------------

router.get(
  "/my",
  verifyToken,
  getMyBuyRequests
);


// ------------------------------------------------------------
// RESTORE
//
// IMPORTANT:
// BEFORE /my/:id
// ------------------------------------------------------------

router.put(
  "/my/:id/restore",
  verifyToken,
  restoreMyBuyRequest
);


// ------------------------------------------------------------
// UPDATE MY BUY REQUEST
//
// Supports optional audio.
// ------------------------------------------------------------

router.put(
  "/my/:id",
  verifyToken,
  uploadBuyRequest.single("audio"),
  updateMyBuyRequest
);


// ------------------------------------------------------------
// SOFT DELETE
// ------------------------------------------------------------

router.delete(
  "/my/:id",
  verifyToken,
  deleteMyBuyRequest
);


// ============================================================
// ADMIN ROUTES
// ============================================================


// ------------------------------------------------------------
// GET ALL BUY REQUESTS
//
// Optional:
// ?type=car
// ?type=bike
// ?type=property
// ?type=electronics
//
// ?status=pending
// ?status=approved
// ?status=rejected
// ------------------------------------------------------------

router.get(
  "/",
  verifyToken,
  isAdmin,
  getBuyRequests
);


// ------------------------------------------------------------
// GET SINGLE
// ------------------------------------------------------------

router.get(
  "/:id",
  verifyToken,
  isAdmin,
  getBuyRequestById
);


// ------------------------------------------------------------
// UPDATE STATUS
// ------------------------------------------------------------

router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  updateBuyRequestStatus
);


// ------------------------------------------------------------
// ADMIN PERMANENT DELETE
// ------------------------------------------------------------

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  deleteBuyRequest
);


// ============================================================
// EXPORT
// ============================================================

export default router;