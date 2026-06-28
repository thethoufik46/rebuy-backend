import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

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
       SAFE EXTENSION
    ========================================= */
    let ext = "m4a";

    if (file.originalname) {
      const parts = file.originalname.split(".");
      if (parts.length > 1) {
        ext = parts.pop().toLowerCase();
      }
    } else if (file.mimetype) {
      const parts = file.mimetype.split("/");
      ext = parts[1] || "m4a";
    }

    const key = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 12)}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "audio/mp4",
      })
    );

    return `${PUBLIC_URL}/${key}`;
  } catch (err) {
    console.error("UPLOAD LEAD AUDIO ERROR 👉", err);
    throw new Error("Audio upload failed");
  }
};

/* =====================================================
   ✅ DELETE LEAD AUDIO
===================================================== */
export const deleteLeadAudio = async (url) => {
  try {
    if (!url) return;

    if (!url.startsWith(PUBLIC_URL)) return;

    const key = url.replace(`${PUBLIC_URL}/`, "");

    if (!key) return;

    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  } catch (err) {
    console.error("DELETE LEAD AUDIO ERROR 👉", err);
  }
};
