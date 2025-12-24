import express from "express";
import {
  toggleWishlist,
  getWishlist,
} from "../controllers/wishlist.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", verifyToken, getWishlist);
router.post("/toggle", verifyToken, toggleWishlist);

export default router;
