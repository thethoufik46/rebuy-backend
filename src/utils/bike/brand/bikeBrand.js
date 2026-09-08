// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import r2 from "../../../config/r2.js";
const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;
export const uploadBikeBrandLogo = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("File buffer missing");
  }
  const ext =
    file.mimetype.split("/")[1] || "jpg";
  const key =
    `bike-brands/${Date.now()}-${Math.random()
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
export const deleteBikeBrandLogo = async (url) => {
  if (!url) return;
  const publicPrefix = `${PUBLIC_URL}/`;
  const key = url.replace(
    publicPrefix,
    ""
  );
  if (!key) return;
  await r2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
};