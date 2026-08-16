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

const router =
  express.Router();

/* ============================================================
   USER / PUBLIC SURVEY SUBMISSION
============================================================ */

/*
   Survey service standalone.
   User model dependency இல்லை.

   Authentication தேவையில்லாமல் enquiry submit செய்யலாம்.
*/

router.post(
  "/add",
  addSurvey
);

/* ============================================================
   ADMIN ROUTES
============================================================ */

/*
   GET ALL SURVEY REQUESTS
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

   IMPORTANT:
   Keep this route BEFORE generic
   DELETE /:id if you later add
   a generic permanent delete route.
*/

router.delete(
  "/:id/permanent",
  verifyToken,
  isAdmin,
  permanentlyDeleteSurvey
);

export default router;