// src/middleware/uploadCar.js
import multer from "multer";

const storage = multer.memoryStorage();

const uploadCar = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default uploadCar;
