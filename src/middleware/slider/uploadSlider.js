// ======================= uploadSlider.js =======================

import multer from "multer";

// ============================================================
// MEMORY STORAGE
// ============================================================

const storage = multer.memoryStorage();

// ============================================================
// FILE FILTER
// ============================================================

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
    return;
  }

  if (file.mimetype === "application/octet-stream") {
    cb(null, true);
    return;
  }

  cb(
    new Error("Only image files are allowed"),
    false
  );
};

// ============================================================
// MULTER CONFIG
// ============================================================

const uploadSlider = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// ============================================================
// EXPORT
// ============================================================

export default uploadSlider;