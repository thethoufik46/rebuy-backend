import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import r2 from "../config/r2.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =====================================================
   ✅ UPLOAD LEAD AUDIO
===================================================== */
export const uploadLeadAudio = async (
  file,
  folder = "leads/audio"
) => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid audio upload");
    }

    /* =========================================
       SAFE EXTENSION DETECTION
    ========================================= */
    let ext = "m4a";

    if (file.mimetype) {
      const parts = file.mimetype.split("/");
      ext = parts[1] || "m4a";
    }

    const key = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "audio/m4a",
      })
    );

    return `${PUBLIC_URL}/${key}`;
  } catch (err) {
    console.error("UPLOAD AUDIO ERROR:", err.message);
    throw new Error("Audio upload failed");
  }
};

/* =====================================================
   ✅ DELETE LEAD AUDIO
===================================================== */
export const deleteLeadAudio = async (url) => {
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
    console.error("DELETE AUDIO ERROR:", err.message);
  }
};