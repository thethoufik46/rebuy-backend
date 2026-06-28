import express from "express";
import { verifyToken } from "../middleware/auth.js";

import {
  addLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
} from "../controllers/lead.controller.js";

const router = express.Router();

/* =====================================================
   ADD LEAD
===================================================== */
router.post("/add", verifyToken, addLead);

/* =====================================================
   GET ALL LEADS
===================================================== */
router.get("/", verifyToken, getLeads);

/* =====================================================
   GET SINGLE LEAD
===================================================== */
router.get("/:id", verifyToken, getLead);

/* =====================================================
   UPDATE LEAD
===================================================== */
router.put("/:id", verifyToken, updateLead);

/* =====================================================
   DELETE LEAD
===================================================== */
router.delete("/:id", verifyToken, deleteLead);

export default router;