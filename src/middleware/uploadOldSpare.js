// ============================================================
// uploadOldSpare.js
// OLD SPARE IMAGE UPLOAD
// ============================================================

import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Unsupported image format. Only JPG, PNG and WEBP are allowed."
      ),
      false
    );
  }
};

const uploadOldSpare = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export default uploadOldSpare;