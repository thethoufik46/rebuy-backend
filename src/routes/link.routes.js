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
   (FOR LINK IMAGE)
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
   🟢 ADD LINK (ADMIN)
   TITLE + IMAGE ONLY
========================= */
router.post(
  "/add",
  verifyToken,
  upload.single("image"),
  addLink
);

/* =========================
   🔵 GET LINKS (PUBLIC)
========================= */
router.get("/", getLinks);

/* =========================
   🟡 UPDATE LINK (ADMIN)
   IMAGE OPTIONAL
========================= */
router.put(
  "/:id",
  verifyToken,
  upload.single("image"),
  updateLink
);

/* =========================
   🔴 DELETE LINK (ADMIN)
========================= */
router.delete(
  "/:id",
  verifyToken,
  deleteLink
);

export default router;
