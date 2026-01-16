// ======================= middleware/uploadProperty.js =======================
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

/* ☁️ CLOUDINARY STORAGE – PROPERTY */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "sellproperty",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

export const uploadPropertyImage = multer({ storage }).single("image");
