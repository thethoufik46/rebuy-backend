// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import r2 from "../../config/r2.js";
import { addWatermarkBuffer } from "../watermark.js";
const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;
/* =====================================================
   BIKE MEDIA UPLOAD
   Gallery → Watermark
   Banner → Watermark
   Audio → Clean
   Video → Clean
===================================================== */
export const uploadBikeImage = async (file, folder) => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid file upload");
    }
    let ext = "jpg";
    if (file.mimetype) {
      const parts = file.mimetype.split("/");
      ext = parts[1] || "jpg";
    }
    const key =
      `${folder}/${Date.now()}-${Math.random()`
      + `.toString(36).slice(2)}.${ext}`;
    let bufferToUpload = file.buffer;
    if (
      folder.includes("gallery") ||
      folder.includes("banner")
    ) {
      bufferToUpload =
        await addWatermarkBuffer(file.buffer);
    }
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: bufferToUpload,
        ContentType:
          file.mimetype || "image/jpeg",
      })
    );
    return `${PUBLIC_URL}/${key}`;
  } catch (err) {
    console.error(
      "BIKE UPLOAD ERROR:",
      err.message
    );
    throw new Error("File upload failed");
  }
};
/* =====================================================
   DELETE BIKE MEDIA FROM R2
===================================================== */
export const deleteBikeImage = async (url) => {
  try {
    if (
      !url ||
      !url.startsWith(PUBLIC_URL)
    ) {
      return;
    }
    const key = url.replace(
      `${PUBLIC_URL}/`,
      ""
    );
    if (!key) return;
    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  } catch (err) {
    console.error(
      "BIKE DELETE ERROR:",
      err.message
    );
  }
};