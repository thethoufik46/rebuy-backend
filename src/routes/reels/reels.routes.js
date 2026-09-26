// ======================= src/routes/reels/reels.routes.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.

import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import { verifyAdminToken } from "../adminAuth.routes.js";
import {
  initUpload,
  completeUpload,
  getFeed,
  getAdminReels,
  shareReel,
  deleteReel,
} from "../../controllers/reels/reels.controller.js";

const router = express.Router();

// ADMIN ONLY — upload + list + delete
router.post("/init", verifyAdminToken, initUpload);
router.post("/complete", verifyAdminToken, completeUpload);
router.get("/admin/list", verifyAdminToken, getAdminReels);
router.delete("/:reelUuid", verifyAdminToken, deleteReel);

// ALL LOGGED-IN USERS — view + share
router.get("/", verifyToken, getFeed);
router.post("/:reelUuid/share", verifyToken, shareReel);

export default router;