// ================= uploadElectronics.js =================

import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // ✅ allow image + video + audio + flutter web support
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype.startsWith("audio/") ||
    file.mimetype === "application/octet-stream"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image, video, audio files allowed"), false);
  }
};

const uploadElectronics = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 🔥 20MB (video support)
  },
  fileFilter,
});

export default uploadElectronics;