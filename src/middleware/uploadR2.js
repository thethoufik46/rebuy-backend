import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import r2 from "../config/r2.js";

const storage = multer.memoryStorage();
export const upload = multer({ storage });

export const uploadToR2 = async (file, folder = "uploads") => {
  const key = `${folder}/${Date.now()}-${file.originalname}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return key; // store this in MongoDB
};
