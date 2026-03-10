import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import r2 from "../config/r2.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;


// IMAGE UPLOAD
export const uploadNotificationImage = async (file) => {
  if (!file) return "";

  const ext = file.mimetype.split("/")[1] || "jpg";

  const key = `notifications/image-${Date.now()}-${Math.random()
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


// AUDIO UPLOAD
export const uploadNotificationAudio = async (file) => {
  if (!file) return "";

  const ext = file.mimetype.split("/")[1] || "mp3";

  const key = `notifications/audio-${Date.now()}-${Math.random()
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


// DELETE IMAGE
export const deleteNotificationImage = async (url) => {
  try {
    if (!url) return;

    const key = url.replace(`${PUBLIC_URL}/`, "");

    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  } catch (err) {
    console.error("Delete error:", err.message);
  }
};