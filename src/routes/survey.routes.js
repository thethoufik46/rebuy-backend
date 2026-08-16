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
   USER / PUBLIC SURVEY SUBMISSION
   ============================================================

   POST /api/survey/add

   IMPORTANT:
   - No authentication required
   - User can submit survey enquiry without login
   - Do NOT add verifyToken here
   - Do NOT add isAdmin here

   ============================================================ */

router.post(
  "/add",
  addSurvey
);


/* ============================================================
   ADMIN ROUTES
   ============================================================ */


/* ============================================================
   GET ALL SURVEY REQUESTS
   GET /api/survey
   ============================================================ */

router.get(
  "/",
  verifyToken,
  isAdmin,
  getSurveys
);


/* ============================================================
   GET SINGLE SURVEY
   GET /api/survey/:id
   ============================================================ */

router.get(
  "/:id",
  verifyToken,
  isAdmin,
  getSurveyById
);


/* ============================================================
   UPDATE SURVEY
   PUT /api/survey/:id
   ============================================================ */

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  updateSurvey
);


/* ============================================================
   UPDATE SURVEY STATUS
   PUT /api/survey/:id/status
   ============================================================ */

router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  updateSurveyStatus
);


/* ============================================================
   SOFT DELETE
   DELETE /api/survey/:id
   ============================================================ */

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  deleteSurvey
);


/* ============================================================
   RESTORE
   PUT /api/survey/:id/restore
   ============================================================ */

router.put(
  "/:id/restore",
  verifyToken,
  isAdmin,
  restoreSurvey
);


/* ============================================================
   PERMANENT DELETE
   DELETE /api/survey/:id/permanent

   Keep this explicit route before any future generic
   permanent-delete route if one is added.
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