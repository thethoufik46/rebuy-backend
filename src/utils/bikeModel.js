import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import r2 from "../config/r2.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =====================================================
   UPLOAD BIKE MODEL IMAGE
===================================================== */

export const uploadBikeModelImage = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("File buffer missing");
  }

  const ext = file.mimetype.split("/")[1] || "jpg";

  const key = `bike-models/${Date.now()}-${Math.random()
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

/* =====================================================
   DELETE BIKE MODEL IMAGE
===================================================== */

export const deleteBikeModelImage = async (url) => {
  if (!url) return;

  const key = url.replace(`${PUBLIC_URL}/`, "");

  await r2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
};