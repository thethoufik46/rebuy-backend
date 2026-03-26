import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import r2 from "../config/r2.js";
import { addWatermarkBuffer } from "./watermark.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =====================================================
   ✅ UPLOAD PROPERTY MEDIA
   - Gallery Images → Watermark
   - Banner → Watermark 🔥 NEW
===================================================== */
export const uploadPropertyImage = async (file, folder) => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid file upload");
    }

    if (!BUCKET || !PUBLIC_URL) {
      throw new Error("R2 config missing");
    }

    /* =========================================
       SAFE EXTENSION DETECTION
    ========================================= */
    let ext = "jpg";

    if (file.mimetype) {
      const parts = file.mimetype.split("/");
      ext = parts[1] || "jpg";
    }

    const key = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    let bufferToUpload = file.buffer;

    /* =========================================
       ✅ APPLY WATERMARK FOR:
       - GALLERY
       - BANNER 🔥 NEW
    ========================================= */
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
    console.error("PROPERTY UPLOAD ERROR:", err.message);
    throw new Error("Property file upload failed");
  }
};

/* =====================================================
   ✅ DELETE PROPERTY MEDIA FROM R2
===================================================== */
export const deletePropertyImage = async (url) => {
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
    console.error("PROPERTY DELETE ERROR:", err.message);
  }
};