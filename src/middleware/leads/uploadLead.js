
import multer from "multer";

/* ============================================================
   MEMORY STORAGE
   Audio file is kept in memory as req.file.buffer.
   It will later be uploaded to Cloudflare R2.
============================================================ */

const storage = multer.memoryStorage();

/* ============================================================
   LEAD AUDIO UPLOAD
   Maximum file size: 10 MB
============================================================ */

const uploadLead = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (req, file, cb) => {
    /*
      Lead audio only.
      Accept common audio MIME types.
    */

    if (!file.mimetype || !file.mimetype.startsWith("audio/")) {
      return cb(new Error("Only audio files are allowed"));
    }

    cb(null, true);
  },
});

/* ============================================================
   EXPORT
============================================================ */

export default uploadLead;
