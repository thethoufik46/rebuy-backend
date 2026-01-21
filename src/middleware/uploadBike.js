// ======================= src/middleware/uploadBike.js =======================
import multer from "multer";

const storage = multer.memoryStorage();

const uploadBike = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default uploadBike;
