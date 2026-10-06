// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import express from "express";

import {
  addLead,
  getLeads,
  getPublishedLeads,  // ← NEW: public published leads
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
// ============================================================
import {
  verifyToken,
  isAdmin,
} from "../../middleware/auth.js";

const router = express.Router();

// ============================================================
// ADMIN AUTH MIDDLEWARE
// ============================================================
const adminOnly = [
  verifyToken,
  isAdmin,
];

// ============================================================
// 0. PUBLIC — GET PUBLISHED LEADS (publish == "on")
// No auth required. Used by user app.
// ============================================================
router.get(
  "/published",
  getPublishedLeads,
);

// ============================================================
// 1. ADD LEAD
// ============================================================
router.post(
  "/add",
  ...adminOnly,
  uploadLead.single("audio"),
  addLead,
);

// ============================================================
// 2. GET ALL ACTIVE LEADS (ADMIN)
// ============================================================
router.get(
  "/",
  ...adminOnly,
  getLeads,
);

// ============================================================
// 3. GET DELETED LEADS
// ============================================================
router.get(
  "/deleted",
  ...adminOnly,
  getDeletedLeads,
);

// ============================================================
// 4. RESTORE MANY
// ============================================================
router.put(
  "/restore-many",
  ...adminOnly,
  restoreManyLeads,
);

// ============================================================
// 5. RESTORE ALL
// ============================================================
router.put(
  "/restore-all",
  ...adminOnly,
  restoreAllLeads,
);

// ============================================================
// 6. PERMANENT DELETE MANY
// ============================================================
router.delete(
  "/permanent-many",
  ...adminOnly,
  permanentDeleteManyLeads,
);

// ============================================================
// 7. ADD REASON
// ============================================================
router.post(
  "/:id/reasons",
  ...adminOnly,
  addLeadReason,
);

// ============================================================
// 8. GET REASON HISTORY
// ============================================================
router.get(
  "/:id/reasons",
  ...adminOnly,
  getLeadReasons,
);

// ============================================================
// 9. DELETE REASON
// ============================================================
router.delete(
  "/:id/reasons/:reasonId",
  ...adminOnly,
  deleteLeadReason,
);

// ============================================================
// 10. UPDATE PUBLISH
// ============================================================
router.put(
  "/:id/publish",
  ...adminOnly,
  updateLeadPublish,
);

// ============================================================
// 11. GET SINGLE LEAD
// ============================================================
router.get(
  "/:id",
  ...adminOnly,
  getLead,
);

// ============================================================
// 12. UPDATE LEAD
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
router.delete(
  "/:id",
  ...adminOnly,
  deleteLead,
);

// ============================================================
// 14. RESTORE SINGLE
// ============================================================
router.put(
  "/restore/:id",
  ...adminOnly,
  restoreLead,
);

// ============================================================
// 15. PERMANENT DELETE SINGLE
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