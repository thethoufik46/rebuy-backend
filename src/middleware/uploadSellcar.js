// ======================= middleware/uploadSellcar.js =======================
import multer from "multer";

const storage = multer.memoryStorage();

const uploadSellcar = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default uploadSellcar;
