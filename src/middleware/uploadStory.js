import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  console.log("MIME:", file.mimetype);  // ✅ DEBUG

  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype === "application/octet-stream"   
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image/video allowed"), false);
  }
};

const uploadStory = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter,
});

export default uploadStory;
