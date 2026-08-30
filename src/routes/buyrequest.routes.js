// ======================= buyrequest.routes.js =======================

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
} from "../controllers/buyrequest.controller.js";

import {
  verifyToken,
  isAdmin,
} from "../middleware/auth.js";

const router = express.Router();


// ============================================================
// USER ROUTES
// ============================================================


// ------------------------------------------------------------
// ADD BUY REQUEST
// ------------------------------------------------------------

router.post(
  "/add",
  verifyToken,
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
// RESTORE DELETED BUY REQUEST
//
// IMPORTANT:
// This route must be BEFORE /my/:id
// ------------------------------------------------------------

router.put(
  "/my/:id/restore",
  verifyToken,
  restoreMyBuyRequest
);


// ------------------------------------------------------------
// UPDATE MY BUY REQUEST
// ------------------------------------------------------------

router.put(
  "/my/:id",
  verifyToken,
  updateMyBuyRequest
);


// ------------------------------------------------------------
// SOFT DELETE MY BUY REQUEST
//
// Request is NOT permanently deleted immediately.
//
// isDeleted       = true
// deletedAt       = current time
// deleteExpiresAt = current time + 24 hours
//
// User can restore within 24 hours.
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
// GET ALL ACTIVE BUY REQUESTS
//
// Optional query:
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
// GET SINGLE BUY REQUEST
// ------------------------------------------------------------

router.get(
  "/:id",
  verifyToken,
  isAdmin,
  getBuyRequestById
);


// ------------------------------------------------------------
// UPDATE BUY REQUEST STATUS
//
// Allowed:
// pending
// approved
// rejected
//
// Admin can also send:
// adminNote
// ------------------------------------------------------------

router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  updateBuyRequestStatus
);


// ------------------------------------------------------------
// ADMIN PERMANENT DELETE
//
// This permanently removes the request.
// R2 audio is also deleted by controller.
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