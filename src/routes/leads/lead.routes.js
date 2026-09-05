
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


const router = express.Router();

/* ============================================================
   1️⃣ STATIC ROUTES
   IMPORTANT:
   Keep these BEFORE /:id
============================================================ */

/* =========================
   ADD / GET LEADS
========================= */

// Add new lead
router.post(
  "/add",
  uploadLead.single("audio"),
  addLead
);

// Get all active leads
router.get(
  "/",
  getLeads
);

// Get recently deleted leads
router.get(
  "/deleted",
  getDeletedLeads
);


/* =========================
   RESTORE
========================= */

// Restore multiple leads
router.put(
  "/restore-many",
  restoreManyLeads
);

// Restore ALL deleted leads
router.put(
  "/restore-all",
  restoreAllLeads
);


/* =========================
   PERMANENT DELETE
========================= */

// Permanently delete multiple deleted leads
router.delete(
  "/permanent-many",
  permanentDeleteManyLeads
);


/* ============================================================
   2️⃣ REASON CHAT / HISTORY ROUTES
   These MUST come before /:id
============================================================ */

/*
   Add a new reason message

   POST /leads/:id/reasons

   Body:
   {
     "message": "Customer asked for finance"
   }
*/
router.post(
  "/:id/reasons",
  addLeadReason
);


/*
   Get complete reason history

   GET /leads/:id/reasons
*/
router.get(
  "/:id/reasons",
  getLeadReasons
);


/*
   Delete one reason history message

   DELETE /leads/:id/reasons/:reasonId
*/
router.delete(
  "/:id/reasons/:reasonId",
  deleteLeadReason
);


/* ============================================================
   3️⃣ PUBLISH ROUTE
============================================================ */

/*
   Update publish status

   PUT /leads/:id/publish

   Body:
   {
     "publish": "on"
   }

   OR

   {
     "publish": "off"
   }
*/
router.put(
  "/:id/publish",
  updateLeadPublish
);


/* ============================================================
   4️⃣ DYNAMIC LEAD ROUTES
============================================================ */

/* =========================
   SINGLE LEAD
========================= */

// Get single lead
router.get(
  "/:id",
  getLead
);


/* =========================
   UPDATE LEAD
========================= */

// Update active lead
router.put(
  "/:id",
  uploadLead.single("audio"),
  updateLead
);


/* =========================
   SOFT DELETE
========================= */

// Move lead to trash
router.delete(
  "/:id",
  deleteLead
);


/* =========================
   RESTORE SINGLE
========================= */

// Restore one deleted lead
router.put(
  "/restore/:id",
  restoreLead
);


/* =========================
   PERMANENT DELETE SINGLE
========================= */

// Permanently delete one deleted lead
router.delete(
  "/permanent/:id",
  permanentDeleteLead
);


/* ============================================================
   EXPORT
============================================================ */

export default router;
