import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

import {
  addStory,
  getStories,
  updateStory,
  deleteStory,
} from "../controllers/story.controller.js";

import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   ☁️ CLOUDINARY STORAGE
========================= */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "stories",
    resource_type: "auto", // image + video
    allowed_formats: ["jpg", "jpeg", "png", "mp4", "mov"],
  },
});

const upload = multer({ storage });

/* =========================
   🟢 ADD STORY (ADMIN)
   form-data:
   - media (file)
   - title (text) ✅
========================= */
router.post(
  "/add",
  verifyToken,
  isAdmin,
  upload.single("media"),
  addStory
);

/* =========================
   🔵 GET STORIES (ADMIN + USER)
========================= */
router.get(
  "/",
  verifyToken,
  getStories
);

/* =========================
   🟡 UPDATE STORY (ADMIN)
   form-data:
   - media (optional file)
   - title (optional text) ✅
========================= */
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  upload.single("media"),
  updateStory
);

/* =========================
   🔴 DELETE STORY (ADMIN)
========================= */
router.delete(  
  "/:id",
  verifyToken,
  isAdmin,
  deleteStory
);
 
export default router;
