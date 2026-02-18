import express from "express";
import { verifyToken } from "../middleware/auth.js";
import uploadTestimonial from "../middleware/uploadTestimonial.js";

import {
  addTestimonial,
  getTestimonials,
  deleteTestimonial,
} from "../controllers/testimonial.controller.js";

const router = express.Router();

router.post(
  "/add",
  verifyToken,
  uploadTestimonial.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  addTestimonial
);

router.put(
  "/:id",
  verifyToken,
  uploadTestimonial.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateTestimonial
);

router.get("/", getTestimonials);

router.delete("/:id", verifyToken, deleteTestimonial);

export default router;
