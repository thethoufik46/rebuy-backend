import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image/video allowed"), false);
  }
};

const uploadStory = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // ✅ Stories can be video → bigger limit
  },
  fileFilter,
});

export default uploadStory;
