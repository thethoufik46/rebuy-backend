import express from "express";
import { toggleWishlist, getWishlist } from "../controllers/wishlist.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* ❤️ GET wishlist for logged-in user */
router.get("/", verifyToken, getWishlist);

/* ❤️ Toggle wishlist */
router.post("/toggle/:carId", verifyToken, toggleWishlist);

export default router;
