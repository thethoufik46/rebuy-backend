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
  permanentDeleteLead,
  permanentDeleteManyLeads,
} from "../controllers/lead.controller.js";

import uploadLead from "../middleware/uploadLead.js";

const router = express.Router();

/* =====================================================
   ADD LEAD
===================================================== */

router.post(
  "/add",
  uploadLead.single("audio"),
  addLead
);

/* =====================================================
   ACTIVE LEADS
===================================================== */

router.get("/", getLeads);

/* =====================================================
   RECENTLY DELETED
===================================================== */

router.get("/deleted", getDeletedLeads);

/* =====================================================
   GET SINGLE LEAD
===================================================== */

router.get("/:id", getLead);

/* =====================================================
   UPDATE LEAD
===================================================== */

router.put(
  "/:id",
  uploadLead.single("audio"),
  updateLead
);

/* =====================================================
   SOFT DELETE
===================================================== */

router.delete("/:id", deleteLead);

/* =====================================================
   RESTORE SINGLE
===================================================== */

router.put("/restore/:id", restoreLead);

/* =====================================================
   RESTORE MULTIPLE
===================================================== */

router.put("/restore-many", restoreManyLeads);

/* =====================================================
   PERMANENT DELETE SINGLE
===================================================== */

router.delete("/permanent/:id", permanentDeleteLead);

/* =====================================================
   PERMANENT DELETE MULTIPLE
===================================================== */

router.delete("/permanent-many", permanentDeleteManyLeads);

export default router;