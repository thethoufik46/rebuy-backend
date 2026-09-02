// ======================= uploadBikeVariant.js =======================

import multer from "multer";

// ============================================================
// MULTER MEMORY STORAGE
// ============================================================

const storage = multer.memoryStorage();

// ============================================================
// FILE FILTER
// ============================================================

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype?.startsWith("image/") ||
    file.mimetype === "application/octet-stream"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error("Only image files are allowed"),
      false
    );
  }
};

// ============================================================
// UPLOAD CONFIGURATION
// ============================================================

const uploadBikeVariant = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

export default uploadBikeVariant;