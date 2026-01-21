// ======================= src/middleware/uploadProperty.js =======================

import multer from "multer";

const storage = multer.memoryStorage();

const uploadProperty = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default uploadProperty;
