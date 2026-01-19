import multer from "multer";
import fs from "fs";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = "uploads/others";

    if (file.fieldname === "image") {
      dir = "uploads/profile";
    }

    if (file.fieldname === "banner") {
      dir = "uploads/cars/banner";
    }

    if (file.fieldname === "gallery") {
      dir = "uploads/cars/gallery";
    }

    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },

  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default upload;
