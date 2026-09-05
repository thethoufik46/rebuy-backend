import express from "express";

import {
  addLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  getDeletedLeads,
  restoreLead,
  restoreManyLeads,
  restoreAllLeads,
  permanentDeleteLead,
  permanentDeleteManyLeads,

  // Reason history
  addLeadReason,
  getLeadReasons,
  deleteLeadReason,

  // Publish
  updateLeadPublish,
} from "../../controllers/leads/lead.controller.js";

import uploadLead from "../../middleware/leads/uploadLead.js";

// ============================================================
// AUTH
// Existing backend auth middleware
// verifyToken = JWT authentication
// isAdmin     = admin authorization
// ============================================================

import {
  verifyToken,
  isAdmin,
} from "../../middleware/auth.js";

const router = express.Router();

// ============================================================
// ADMIN AUTH MIDDLEWARE
//
// EVERY LEAD API IS ADMIN ONLY.
//
// Request flow:
//
// Flutter
//   ↓
// Authorization: Bearer JWT
//   ↓
// verifyToken
//   ↓
// isAdmin
//   ↓
// Lead Controller
//
// Without valid JWT       → 401
// Logged-in non-admin     → 403
// Admin                   → controller
// ============================================================

const adminOnly = [
  verifyToken,
  isAdmin,
];

// ============================================================
// 1. ADD LEAD
// ============================================================
//
// POST /api/leads/add
//
// Auth required
// Admin only
// Audio upload happens ONLY after authentication.
//
// ============================================================

router.post(
  "/add",
  ...adminOnly,
  uploadLead.single("audio"),
  addLead,
);

// ============================================================
// 2. GET ALL ACTIVE LEADS
// ============================================================
//
// GET /api/leads
//
// IMPORTANT:
// This endpoint is NO LONGER PUBLIC.
//
// Browser:
// https://rebuy-api.onrender.com/api/leads
//
// without JWT:
// 401 Unauthorized
//
// ============================================================

router.get(
  "/",
  ...adminOnly,
  getLeads,
);

// ============================================================
// 3. GET DELETED LEADS
// ============================================================
//
// GET /api/leads/deleted
//
// Admin only
//
// ============================================================

router.get(
  "/deleted",
  ...adminOnly,
  getDeletedLeads,
);

// ============================================================
// 4. RESTORE MANY
// ============================================================
//
// PUT /api/leads/restore-many
//
// ============================================================

router.put(
  "/restore-many",
  ...adminOnly,
  restoreManyLeads,
);

// ============================================================
// 5. RESTORE ALL
// ============================================================
//
// PUT /api/leads/restore-all
//
// ============================================================

router.put(
  "/restore-all",
  ...adminOnly,
  restoreAllLeads,
);

// ============================================================
// 6. PERMANENT DELETE MANY
// ============================================================
//
// DELETE /api/leads/permanent-many
//
// Admin only
//
// ============================================================

router.delete(
  "/permanent-many",
  ...adminOnly,
  permanentDeleteManyLeads,
);

// ============================================================
// 7. ADD REASON
// ============================================================
//
// POST /api/leads/:id/reasons
//
// Body:
//
// {
//   "message": "Customer asked for finance"
// }
//
// ============================================================

router.post(
  "/:id/reasons",
  ...adminOnly,
  addLeadReason,
);

// ============================================================
// 8. GET REASON HISTORY
// ============================================================
//
// GET /api/leads/:id/reasons
//
// ============================================================

router.get(
  "/:id/reasons",
  ...adminOnly,
  getLeadReasons,
);

// ============================================================
// 9. DELETE REASON
// ============================================================
//
// DELETE /api/leads/:id/reasons/:reasonId
//
// ============================================================

router.delete(
  "/:id/reasons/:reasonId",
  ...adminOnly,
  deleteLeadReason,
);

// ============================================================
// 10. UPDATE PUBLISH
// ============================================================
//
// PUT /api/leads/:id/publish
//
// Body:
//
// {
//   "publish": "on"
// }
//
// OR
//
// {
//   "publish": "off"
// }
//
// ============================================================

router.put(
  "/:id/publish",
  ...adminOnly,
  updateLeadPublish,
);

// ============================================================
// 11. GET SINGLE LEAD
// ============================================================
//
// GET /api/leads/:id
//
// Admin only.
//
// Direct browser access without JWT:
// 401 Unauthorized
//
// ============================================================

router.get(
  "/:id",
  ...adminOnly,
  getLead,
);

// ============================================================
// 12. UPDATE LEAD
// ============================================================
//
// PUT /api/leads/:id
//
// Authentication happens BEFORE multer.
//
// This is important because unauthenticated users
// should not even be allowed to upload an audio file.
//
// ============================================================

router.put(
  "/:id",
  ...adminOnly,
  uploadLead.single("audio"),
  updateLead,
);

// ============================================================
// 13. SOFT DELETE
// ============================================================
//
// DELETE /api/leads/:id
//
// Admin only
//
// ============================================================

router.delete(
  "/:id",
  ...adminOnly,
  deleteLead,
);

// ============================================================
// 14. RESTORE SINGLE
// ============================================================
//
// PUT /api/leads/restore/:id
//
// Admin only
//
// ============================================================

router.put(
  "/restore/:id",
  ...adminOnly,
  restoreLead,
);

// ============================================================
// 15. PERMANENT DELETE SINGLE
// ============================================================
//
// DELETE /api/leads/permanent/:id
//
// Admin only
//
// ============================================================

router.delete(
  "/permanent/:id",
  ...adminOnly,
  permanentDeleteLead,
);

// ============================================================
// EXPORT
// ============================================================

export default router;