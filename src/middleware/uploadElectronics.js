import multer from "multer";

const storage = multer.memoryStorage();

const uploadElectronics = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // optional
});

export default uploadElectronics;