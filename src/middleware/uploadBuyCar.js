import multer from "multer";

const storage = multer.memoryStorage();

const uploadBuyCar = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/webm",
    ];

    /*
     * Some Android devices send
     * application/octet-stream for m4a.
     */
    if (
      allowed.includes(file.mimetype) ||
      file.originalname?.toLowerCase().endsWith(".m4a") ||
      file.originalname?.toLowerCase().endsWith(".mp3") ||
      file.originalname?.toLowerCase().endsWith(".wav")
    ) {
      return cb(null, true);
    }

    return cb(
      new Error("Only audio files are allowed")
    );
  },
});

export default uploadBuyCar;