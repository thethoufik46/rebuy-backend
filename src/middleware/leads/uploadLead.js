import multer from "multer";

// ============================================================
// MEMORY STORAGE
// ============================================================
const storage = multer.memoryStorage();

// ============================================================
// LEAD AUDIO UPLOAD
// Max: 10 MB
// AAC + M4A + MP3 + WAV + OGG + common audio formats
// ============================================================
const uploadLead = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    const name = (file.originalname || "").toLowerCase();
    const audioExt = /\.(aac|m4a|mp3|wav|ogg|oga|webm|opus|flac)$/i.test(name);

    if (mime.startsWith("audio/") || audioExt) {
      return cb(null, true);
    }

    return cb(new Error("Only audio files are allowed"));
  },
});

export default uploadLead;