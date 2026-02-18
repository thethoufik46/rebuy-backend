import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadTestimonial from "../middleware/uploadTestimonial.js";

import {
  addTestimonial,
  getTestimonials,
  updateTestimonial,
  deleteTestimonial,
} from "../controllers/testimonial.controller.js";

const router = express.Router();

/* =====================================================
   ADD
===================================================== */
router.post(
  "/add",
  verifyToken,
  uploadTestimonial.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  addTestimonial
);

/* =====================================================
   GET
===================================================== */
router.get("/", getTestimonials);

/* =====================================================
   UPDATE 🔥 FIXED
===================================================== */
router.put(
  "/:id",
  verifyToken,
  uploadTestimonial.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateTestimonial
);

/* =====================================================
   DELETE
===================================================== */
router.delete("/:id", verifyToken, deleteTestimonial);

export default router;
