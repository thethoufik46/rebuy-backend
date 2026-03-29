import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import r2 from "../config/r2.js";
import { addWatermarkBuffer } from "./watermark.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =====================================================
   ✅ UPLOAD ELECTRONICS MEDIA
   - Banner → Watermark
   - Gallery → Watermark
   - Audio → Clean
   - Video → Clean
===================================================== */
export const uploadElectronicsMedia = async (file, folder) => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid file upload");
    }

    /* 🔥 SAFE EXTENSION */
    let ext = "jpg";

    if (file.mimetype) {
      const parts = file.mimetype.split("/");
      ext = parts[1] || "jpg";
    }

    const key = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    let bufferToUpload = file.buffer;

    /* 🔥 WATERMARK ONLY FOR IMAGES */
    if (
      folder.includes("gallery") ||
      folder.includes("banner")
    ) {
      bufferToUpload = await addWatermarkBuffer(file.buffer);
    }

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: bufferToUpload,
        ContentType: file.mimetype || "image/jpeg",
      })
    );

    return `${PUBLIC_URL}/${key}`;
  } catch (err) {
    console.error("UPLOAD ERROR:", err.message);
    throw new Error("Electronics upload failed");
  }
};

/* =====================================================
   ✅ DELETE ELECTRONICS MEDIA
===================================================== */
export const deleteElectronicsMedia = async (url) => {
  try {
    if (!url || !url.startsWith(PUBLIC_URL)) return;

    const key = url.replace(`${PUBLIC_URL}/`, "");

    if (!key) return;

    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  } catch (err) {
    console.error("DELETE ERROR:", err.message);
  }
};