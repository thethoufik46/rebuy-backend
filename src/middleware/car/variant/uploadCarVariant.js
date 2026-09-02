// ======================= uploadCarVariant.js =======================

import multer from "multer";

// ============================================================
// MEMORY STORAGE
// ============================================================

const storage =
  multer.memoryStorage();

// ============================================================
// FILE FILTER
// ============================================================

const fileFilter = (
  req,
  file,
  cb
) => {
  if (
    file.mimetype.startsWith(
      "image/"
    ) ||
    file.mimetype ===
      "application/octet-stream"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only image files allowed"
      ),
      false
    );
  }
};

// ============================================================
// MULTER
// ============================================================

const uploadCarVariant = multer({
  storage,

  limits: {
    fileSize:
      10 * 1024 * 1024,
  },

  fileFilter,
});

export default uploadCarVariant;