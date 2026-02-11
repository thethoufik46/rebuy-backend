import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import r2 from "../config/r2.js";
import { addWatermarkBuffer } from "./watermark.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =====================================================
   UPLOAD CAR IMAGE
   ✅ Gallery → Watermark
   ✅ Banner → Clean
===================================================== */
export const uploadCarImage = async (file, folder) => {
  const ext = file.mimetype.split("/")[1] || "jpg";

  const key = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  let bufferToUpload = file.buffer;

  /* ✅ APPLY WATERMARK ONLY FOR GALLERY */
  if (folder.includes("gallery")) {
    bufferToUpload = await addWatermarkBuffer(file.buffer);
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: bufferToUpload,
      ContentType: file.mimetype,
    })
  );

  return `${PUBLIC_URL}/${key}`;
};

/* =====================================================
   DELETE IMAGE
===================================================== */
export const deleteCarImage = async (url) => {
  if (!url) return;

  const key = url.replace(`${PUBLIC_URL}/`, "");

  await r2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
};
