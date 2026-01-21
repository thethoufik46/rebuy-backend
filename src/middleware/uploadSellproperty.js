// ======================= src/middleware/uploadSellproperty.js =======================

import multer from "multer";

const storage = multer.memoryStorage();

const uploadSellProperty = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default uploadSellProperty;
