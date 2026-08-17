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
   USER SURVEY
============================================================ */

/*
   LOGIN REQUIRED

   POST /api/survey/add
*/
router.post(
  "/add",
  verifyToken,
  addSurvey
);


/*
   LOGIN REQUIRED

   GET /api/survey/my

   Returns ONLY current logged-in user's surveys.
*/
router.get(
  "/my",
  verifyToken,
  getMySurveys
);


/* ============================================================
   ADMIN
============================================================ */

/*
   GET ALL SURVEYS
*/
router.get(
  "/",
  verifyToken,
  isAdmin,
  getSurveys
);


/*
   GET SINGLE SURVEY
*/
router.get(
  "/:id",
  verifyToken,
  isAdmin,
  getSurveyById
);


/*
   UPDATE SURVEY
*/
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  updateSurvey
);


/*
   UPDATE STATUS
*/
router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  updateSurveyStatus
);


/*
   SOFT DELETE
*/
router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  deleteSurvey
);


/*
   RESTORE
*/
router.put(
  "/:id/restore",
  verifyToken,
  isAdmin,
  restoreSurvey
);


/*
   PERMANENT DELETE
*/
router.delete(
  "/:id/permanent",
  verifyToken,
  isAdmin,
  permanentlyDeleteSurvey
);


export default router;