// ======================= src/middleware/reels/uploadReels.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.

import multer from "multer";

// ============================================================
// MEMORY STORAGE
// ============================================================

const storage = multer.memoryStorage();

// ============================================================
// FILE FILTER
// ============================================================

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
    return;
  }

  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
    return;
  }

  if (file.mimetype === "application/octet-stream") {
    cb(null, true);
    return;
  }

  cb(new Error("Only video or image files are allowed"), false);
};

// ============================================================
// MULTER CONFIG
// ============================================================

const uploadReel = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 200 * 1024 * 1024,
  },
});

// ============================================================
// EXPORT
// ============================================================

export default uploadReel;