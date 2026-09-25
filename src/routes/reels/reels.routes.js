// ======================= src/routes/reels/reels.routes.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.

import express from "express";
import { verifyToken, isAdmin } from "../../middleware/auth.js";

import {
  initUpload,
  completeUpload,
  getFeed,
  shareReel,
  deleteReel,
} from "../../controllers/reels/reels.controller.js";

const router = express.Router();

// ============================================================
// ADMIN ONLY — UPLOAD
// ============================================================

router.post("/init", verifyToken, isAdmin, initUpload);

router.post("/complete", verifyToken, isAdmin, completeUpload);

router.delete("/:reelUuid", verifyToken, isAdmin, deleteReel);

// ============================================================
// ALL LOGGED-IN USERS — VIEW + SHARE
// ============================================================

router.get("/", verifyToken, getFeed);

router.post("/:reelUuid/share", verifyToken, shareReel);

// ============================================================
// EXPORT
// ============================================================

export default router;