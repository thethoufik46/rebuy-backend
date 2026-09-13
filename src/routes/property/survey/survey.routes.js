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
} from "../../../controllers/property/survey/survey.controller.js";

import {
  verifyToken,
  isAdmin,
} from "../../../middleware/auth.js";

const router = express.Router();

/* ============================================================
   USER SURVEY
   ============================================================ */

/**
 * LOGIN REQUIRED
 * POST /api/survey/add
 */
router.post(
  "/add",
  verifyToken,
  addSurvey
);

/**
 * LOGIN REQUIRED
 * GET /api/survey/my
 *
 * Returns ONLY current logged-in user's surveys.
 */
router.get(
  "/my",
  verifyToken,
  getMySurveys
);

/* ============================================================
   ADMIN
   ============================================================ */

/**
 * GET ALL SURVEYS
 *
 * GET /api/survey
 *
 * ADMIN ONLY
 *
 * Optional query parameters:
 * ?status=pending
 * ?district=Madurai
 * ?surveyType=Land%20Measurement
 * ?propertyType=Residential%20Plot
 */
router.get(
  "/",
  verifyToken,
  isAdmin,
  getSurveys
);

/**
 * GET SINGLE SURVEY
 *
 * GET /api/survey/:id
 *
 * ADMIN ONLY
 */
router.get(
  "/:id",
  verifyToken,
  isAdmin,
  getSurveyById
);

/**
 * UPDATE SURVEY
 *
 * PUT /api/survey/:id
 *
 * ADMIN ONLY
 */
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  updateSurvey
);

/**
 * UPDATE STATUS
 *
 * PUT /api/survey/:id/status
 *
 * ADMIN ONLY
 */
router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  updateSurveyStatus
);

/**
 * SOFT DELETE
 *
 * DELETE /api/survey/:id
 *
 * ADMIN ONLY
 */
router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  deleteSurvey
);

/**
 * RESTORE
 *
 * PUT /api/survey/:id/restore
 *
 * ADMIN ONLY
 */
router.put(
  "/:id/restore",
  verifyToken,
  isAdmin,
  restoreSurvey
);

/**
 * PERMANENT DELETE
 *
 * DELETE /api/survey/:id/permanent
 *
 * ADMIN ONLY
 */
router.delete(
  "/:id/permanent",
  verifyToken,
  isAdmin,
  permanentlyDeleteSurvey
);

export default router;