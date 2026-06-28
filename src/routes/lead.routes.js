import express from "express";

import {
  addLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
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
   GET ALL LEADS
===================================================== */

router.get("/", getLeads);

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
   DELETE LEAD
===================================================== */

router.delete("/:id", deleteLead);

export default router;