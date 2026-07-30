import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import r2 from "../config/r2.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =====================================================
   ✅ UPLOAD USER IMAGE
   - Profile  -> No Watermark
   - Gallery  -> No Watermark
===================================================== */

export const uploadUserImage = async (file, folder) => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid file upload");
    }

    let ext = "jpg";

    if (file.mimetype) {
      const parts = file.mimetype.split("/");
      ext = parts[1] || "jpg";
    }

    const key = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "image/jpeg",
      })
    );

    return `${PUBLIC_URL}/${key}`;
  } catch (err) {
    console.error("USER UPLOAD ERROR:", err.message);
    throw new Error("User image upload failed");
  }
};

/* =====================================================
   ✅ DELETE USER IMAGE
===================================================== */

export const deleteUserImage = async (url) => {
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
    console.error("USER DELETE ERROR:", err.message);
  }
};