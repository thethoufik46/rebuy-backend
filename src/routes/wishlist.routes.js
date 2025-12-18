import express from "express";
import { toggleWishlist, getWishlist } from "../controllers/wishlist.controller.js";

const router = express.Router();

// ✅ Get all wishlist cars for a user (by ID)
router.get("/:userId", getWishlist);

// ✅ Add/remove car from wishlist
router.post("/", toggleWishlist);

export default router;
