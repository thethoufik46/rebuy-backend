import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import r2 from "../config/r2.js";
import { addWatermarkBuffer } from "./watermark.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =====================================================
   ✅ UPLOAD CAR MEDIA
   - Gallery Images → Watermark
   - Banner → Clean
   - Audio → Clean
   - Video → Clean
===================================================== */
export const uploadCarImage = async (file, folder) => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid file upload");
    }

    const mimeParts = file.mimetype.split("/");
    const ext = mimeParts[1] || "jpg";

    const key = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    let bufferToUpload = file.buffer;

    /* =====================================================
       ✅ APPLY WATERMARK ONLY FOR GALLERY IMAGES
    ===================================================== */
    if (
      folder.includes("gallery") &&
      file.mimetype.startsWith("image/")
    ) {
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
  } catch (err) {
    console.error("UPLOAD ERROR:", err.message);
    throw new Error("File upload failed");
  }
};

/* =====================================================
   ✅ DELETE MEDIA FROM R2
===================================================== */
export const deleteCarImage = async (url) => {
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