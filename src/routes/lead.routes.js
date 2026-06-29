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
  restoreAllLeads,          // ✅ new
  permanentDeleteLead,
  permanentDeleteManyLeads,
} from "../controllers/lead.controller.js";

import uploadLead from "../middleware/uploadLead.js";

const router = express.Router();

router.post("/add", uploadLead.single("audio"), addLead);
router.get("/", getLeads);
router.get("/deleted", getDeletedLeads);
router.get("/:id", getLead);
router.put("/:id", uploadLead.single("audio"), updateLead);
router.delete("/:id", deleteLead);
router.put("/restore/:id", restoreLead);
router.put("/restore-many", restoreManyLeads);
router.put("/restore-all", restoreAllLeads);        // ✅ emergency restore
router.delete("/permanent/:id", permanentDeleteLead);
router.delete("/permanent-many", permanentDeleteManyLeads);

export default router;