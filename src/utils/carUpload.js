// src/utils/carUpload.js
import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import r2 from "../config/r2.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

export const uploadCarImage = async (file, folder = "cars") => {
  const ext = file.mimetype.split("/")[1];
  const key = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return `${PUBLIC_URL}/${key}`;
};

export const deleteCarImage = async (imageUrl) => {
  if (!imageUrl) return;

  const key = imageUrl.replace(`${PUBLIC_URL}/`, "");

  await r2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
};
