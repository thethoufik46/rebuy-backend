// ============================================================
// CAR BRAND UPLOAD MIDDLEWARE
// ============================================================

import multer from "multer";

// ============================================================
// MEMORY STORAGE
// ============================================================

const storage = multer.memoryStorage();

// ============================================================
// FILE FILTER
// ============================================================

const fileFilter = (req, file, cb) => {
  // Allow normal image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
    return;
  }

  // Allow octet-stream
  if (file.mimetype === "application/octet-stream") {
    cb(null, true);
    return;
  }

  // Reject other files
  cb(
    new Error("Only image files are allowed"),
    false
  );
};

// ============================================================
// MULTER CONFIG
// ============================================================

const uploadCarBrand = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// ============================================================
// EXPORT
// ============================================================

export default uploadCarBrand;