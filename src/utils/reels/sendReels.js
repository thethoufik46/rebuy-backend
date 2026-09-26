// ======================= src/utils/reels/sendReels.js =======================
// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_REELS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_REELS_ACCESS_KEY,
    secretAccessKey: process.env.R2_REELS_SECRET_KEY,
  },
});

const BUCKET = process.env.R2_REELS_BUCKET;
const PUBLIC_URL = process.env.R2_REELS_PUBLIC_URL;

export const getSignedUploadUrl = async (key, contentType = "video/mp4", expiresIn = 600) => {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(r2, cmd, { expiresIn });
};

export const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, cmd, { expiresIn });
};

export const uploadReelFile = async (key, buffer, contentType) => {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }));
};

export const deleteReelFile = async (key) => {
  if (!key) return;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.error("DELETE REEL FILE ERROR 👉", err);
  }
};

export const publicUrl = (key) => {
  if (!key) return null;
  return `${PUBLIC_URL}/${key}`;
};

export { r2, BUCKET };