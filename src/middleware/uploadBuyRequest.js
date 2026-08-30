// ============================================================
// uploadBuyRequest.js
// BUY REQUEST AUDIO UPLOAD
// ============================================================

import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/aac",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/webm",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Unsupported audio format"),
      false
    );
  }
};

const uploadBuyRequest = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

export default uploadBuyRequest;