import express from "express";
import { verifyToken } from "../middleware/auth.js";
import upload from "../middleware/uploadTestimonial.js";

import {
  addTestimonial,
  getTestimonials,
  updateTestimonial,
  deleteTestimonial,
} from "../controllers/testimonial.controller.js";

const router = express.Router();

/* ===================================================== */
/* ✅ ADD TESTIMONIAL */
router.post(
  "/add",
  verifyToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  addTestimonial
);

/* ===================================================== */
/* ✅ GET TESTIMONIALS */
router.get("/", getTestimonials);

/* ===================================================== */
/* ✅ UPDATE TESTIMONIAL */
router.put(
  "/:id",
  verifyToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateTestimonial
);

/* ===================================================== */
/* ✅ DELETE TESTIMONIAL */
router.delete("/:id", verifyToken, deleteTestimonial);

export default router;
