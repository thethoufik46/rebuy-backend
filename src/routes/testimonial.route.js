import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import {
  addTestimonial,
  getTestimonials,
  updateTestimonial,
  deleteTestimonial,
} from "../controllers/testimonial.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   ☁️ CLOUDINARY STORAGE
========================= */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "testimonials",
    resource_type: "auto",
    allowed_formats: ["jpg", "jpeg", "png", "mp4"],
  },
});

const upload = multer({ storage });

/* =========================
   🟢 ADD (ADMIN)
========================= */
router.post(
  "/add",
  verifyToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  addTestimonial
);

/* =========================
   🔵 GET (USER)
========================= */
router.get("/", getTestimonials);

/* =========================
   🟡 UPDATE (ADMIN)
========================= */
router.put(
  "/:id",
  verifyToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateTestimonial
);

/* =========================
   🔴 DELETE (ADMIN)
========================= */
router.delete("/:id", verifyToken, deleteTestimonial);

export default router;
