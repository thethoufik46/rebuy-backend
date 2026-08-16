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
   USER SURVEY SUBMISSION
============================================================ */

/*
   User must be logged in.

   POST /api/survey/add
*/

router.post(
  "/add",
  verifyToken,
  addSurvey
);

/* ============================================================
   USER - MY SURVEYS
============================================================ */

/*
   IMPORTANT:
   Keep /my BEFORE /:id

   GET /api/survey/my

   Returns ONLY the logged-in user's
   survey requests.
*/

router.get(
  "/my",
  verifyToken,
  getMySurveys
);

/* ============================================================
   ADMIN ROUTES
============================================================ */

/*
   GET ALL SURVEY REQUESTS

   GET /api/survey
*/

router.get(
  "/",
  verifyToken,
  isAdmin,
  getSurveys
);

/* ============================================================
   ADMIN - GET SINGLE
============================================================ */

/*
   GET /api/survey/:id
*/

router.get(
  "/:id",
  verifyToken,
  isAdmin,
  getSurveyById
);

/* ============================================================
   ADMIN - UPDATE SURVEY
============================================================ */

/*
   PUT /api/survey/:id
*/

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  updateSurvey
);

/* ============================================================
   ADMIN - UPDATE STATUS
============================================================ */

/*
   PUT /api/survey/:id/status
*/

router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  updateSurveyStatus
);

/* ============================================================
   ADMIN - SOFT DELETE
============================================================ */

/*
   DELETE /api/survey/:id
*/

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  deleteSurvey
);

/* ============================================================
   ADMIN - RESTORE
============================================================ */

/*
   PUT /api/survey/:id/restore
*/

router.put(
  "/:id/restore",
  verifyToken,
  isAdmin,
  restoreSurvey
);

/* ============================================================
   ADMIN - PERMANENT DELETE
============================================================ */

/*
   DELETE /api/survey/:id/permanent
*/

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