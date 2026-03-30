import express from "express";
import {
  addRecentlyViewed,
  getRecentlyViewed,
} from "../controllers/recently.viewed.controller.js";

import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/recently-viewed", verifyToken, addRecentlyViewed);
router.get("/recently-viewed", verifyToken, getRecentlyViewed);

export default router;