import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  console.log("MIME:", file.mimetype);

  if (
    file.mimetype.includes("image") ||
    file.mimetype.includes("video") ||
    file.mimetype === "application/octet-stream"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image/video files allowed"), false);
  }
};

const uploadStory = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // ✅ 50MB (stories safe)
  },
  fileFilter,
});

export default uploadStory;
