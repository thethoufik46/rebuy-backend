import multer from "multer";

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadSingle = upload.single("image");
export const uploadMultiple = upload.array("images", 6);

export default upload;
