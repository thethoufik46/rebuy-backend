import express from "express";
import { commonSearch } from "../controllers/common.search.controller.js";

const router = express.Router();

// =====================================================
// COMMON SEARCH
// GET /api/search?q=BMW
// =====================================================

router.get("/search", commonSearch);

export default router;