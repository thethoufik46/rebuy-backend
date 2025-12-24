import express from "express";
import {
  toggleWishlist,
  getWishlist,
} from "../controllers/wishlist.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* ❤️ GET wishlist (CAR + BIKE) */
router.get("/", verifyToken, getWishlist);

/* ❤️ TOGGLE wishlist (CAR / BIKE) */
router.post("/toggle", verifyToken, toggleWishlist);

export default router;
