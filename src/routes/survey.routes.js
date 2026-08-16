// ======================= survey.routes.js =======================

import express from "express";

import {
  addSurvey,
  getSurveys,
  getSurveyById,
  updateSurvey,
  updateSurveyStatus,
  deleteSurvey,
  restoreSurvey,
  permanentlyDeleteSurvey,
} from "../controllers/survey.controller.js";

import {
  verifyToken,
  isAdmin,
} from "../middleware/auth.js";

const router = express.Router();

/* ============================================================
   PUBLIC USER SURVEY SUBMISSION
   ============================================================

   POST /api/survey/add

   Login NOT required.

   ============================================================ */

router.post(
  "/add",
  addSurvey
);


/* ============================================================
   ADMIN - GET ALL
   ============================================================ */

router.get(
  "/",
  verifyToken,
  isAdmin,
  getSurveys
);


/* ============================================================
   ADMIN - GET SINGLE
   ============================================================ */

router.get(
  "/:id",
  verifyToken,
  isAdmin,
  getSurveyById
);


/* ============================================================
   ADMIN - UPDATE
   ============================================================ */

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  updateSurvey
);


/* ============================================================
   ADMIN - UPDATE STATUS
   ============================================================ */

router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  updateSurveyStatus
);


/* ============================================================
   ADMIN - SOFT DELETE
   ============================================================ */

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  deleteSurvey
);


/* ============================================================
   ADMIN - RESTORE
   ============================================================ */

router.put(
  "/:id/restore",
  verifyToken,
  isAdmin,
  restoreSurvey
);


/* ============================================================
   ADMIN - PERMANENT DELETE
   ============================================================ */

router.delete(
  "/:id/permanent",
  verifyToken,
  isAdmin,
  permanentlyDeleteSurvey
);


/* ============================================================
   EXPORT
   ============================================================ */

export default router;