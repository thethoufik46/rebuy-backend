import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import r2 from "../config/r2.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =====================================================
   BUY CAR / NEED AUDIO UPLOAD
===================================================== */

export const uploadBuyCarAudio = async (
  file,
  folder = "buycar/audio"
) => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid audio file");
    }

    if (!BUCKET) {
      throw new Error("R2_BUCKET is missing");
    }

    if (!PUBLIC_URL) {
      throw new Error("R2_PUBLIC_URL is missing");
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
    }

    /* =========================================
       ALLOWED AUDIO EXTENSIONS
    ========================================= */

    const allowed = [
      "m4a",
      "mp3",
      "wav",
      "aac",
      "ogg",
      "webm",
    ];

    if (!allowed.includes(ext)) {
      ext = "m4a";
    }

    /* =========================================
       UNIQUE FILE NAME
    ========================================= */

    const key =
      `${folder}/${Date.now()}-` +
      `${Math.random().toString(36).substring(2, 12)}.${ext}`;

    /* =========================================
       R2 UPLOAD
    ========================================= */

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "audio/mp4",
      })
    );

    /* =========================================
       PUBLIC URL
    ========================================= */

    const publicBase = PUBLIC_URL.replace(/\/$/, "");

    return `${publicBase}/${key}`;
  } catch (error) {
    console.error(
      "BUY CAR AUDIO UPLOAD ERROR 👉",
      error
    );

    throw new Error("BuyCar audio upload failed");
  }
};

/* =====================================================
   DELETE BUY CAR AUDIO
===================================================== */

export const deleteBuyCarAudio = async (url) => {
  try {
    if (!url) return;

    const publicBase = PUBLIC_URL?.replace(/\/$/, "");

    if (!publicBase) return;

    if (!url.startsWith(publicBase)) {
      return;
    }

    const key = url.replace(`${publicBase}/`, "");

    if (!key) return;

    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  } catch (error) {
    console.error(
      "BUY CAR AUDIO DELETE ERROR 👉",
      error
    );
  }
};