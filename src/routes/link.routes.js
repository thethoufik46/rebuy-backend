import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import { verifyToken } from "../middleware/auth.js";

import {
  addLink,
  getLinks,
  updateLink,
  deleteLink,
} from "../controllers/link.controller.js";

const router = express.Router();

/* =========================
   ☁️ CLOUDINARY STORAGE
========================= */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "links",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage });

/* =========================
   ROUTES
========================= */
router.post(
  "/add",
  verifyToken,
  upload.single("image"),
  addLink
);

router.get("/", getLinks);

router.put(
  "/:id",
  verifyToken,
  upload.single("image"),
  updateLink
);

router.delete(
  "/:id",
  verifyToken,
  deleteLink
);

export default router;
