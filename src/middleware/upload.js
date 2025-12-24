// ======================= middleware/upload.js =======================
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

/* ☁️ CLOUDINARY STORAGE */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "sellcars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

/* 🖼️ SINGLE IMAGE UPLOAD */
export const uploadSingle = multer({ storage }).single("image");
