// ======================= survey.routes.js =======================

import express from "express";

import {
  addSurvey,
  getMySurveys,
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


const router =
  express.Router();


/* ============================================================
   PUBLIC USER SURVEY SUBMISSION

   POST /api/survey/add

   LOGIN NOT REQUIRED

   IMPORTANT:
   No verifyToken here.
   No isAdmin here.
============================================================ */

router.post(
  "/add",
  addSurvey
);


/* ============================================================
   USER SURVEY HISTORY

   GET /api/survey/my

   LOGIN REQUIRED

   This is ONLY for viewing the logged-in user's
   previous survey requests.
============================================================ */

router.get(
  "/my",
  verifyToken,
  getMySurveys
);


/* ============================================================
   ADMIN - GET ALL

   GET /api/survey
============================================================ */

router.get(
  "/",
  verifyToken,
  isAdmin,
  getSurveys
);


/* ============================================================
   ADMIN - GET SINGLE

   GET /api/survey/:id
============================================================ */

router.get(
  "/:id",
  verifyToken,
  isAdmin,
  getSurveyById
);


/* ============================================================
   ADMIN - UPDATE

   PUT /api/survey/:id
============================================================ */

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  updateSurvey
);


/* ============================================================
   ADMIN - UPDATE STATUS

   PUT /api/survey/:id/status
============================================================ */

router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  updateSurveyStatus
);


/* ============================================================
   ADMIN - SOFT DELETE

   DELETE /api/survey/:id
============================================================ */

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  deleteSurvey
);


/* ============================================================
   ADMIN - RESTORE

   PUT /api/survey/:id/restore
============================================================ */

router.put(
  "/:id/restore",
  verifyToken,
  isAdmin,
  restoreSurvey
);


/* ============================================================
   ADMIN - PERMANENT DELETE

   DELETE /api/survey/:id/permanent
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