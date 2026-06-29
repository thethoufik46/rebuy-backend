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
} from "../controllers/lead.controller.js";

import uploadLead from "../middleware/uploadLead.js";

const router = express.Router();

// ============================================================
// 1️⃣ STATIC ROUTES (no dynamic :id)
// ============================================================

router.post("/add", uploadLead.single("audio"), addLead);

router.get("/", getLeads);                     // all active leads

router.get("/deleted", getDeletedLeads);       // recently deleted

router.put("/restore-many", restoreManyLeads); // restore multiple

router.put("/restore-all", restoreAllLeads);   // restore ALL (emergency)

router.delete("/permanent-many", permanentDeleteManyLeads); // delete many

// ============================================================
// 2️⃣ DYNAMIC ROUTES (with :id)
// ============================================================

router.get("/:id", getLead);                                     // single lead

router.put("/:id", uploadLead.single("audio"), updateLead);      // update

router.delete("/:id", deleteLead);                               // soft delete

router.put("/restore/:id", restoreLead);                         // restore single

router.delete("/permanent/:id", permanentDeleteLead);            // permanent delete single

export default router;