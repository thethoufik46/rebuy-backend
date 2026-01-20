import multer from "multer";

const storage = multer.memoryStorage();

const uploadCarBrand = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default uploadCarBrand;
