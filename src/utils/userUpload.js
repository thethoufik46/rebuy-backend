import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import r2 from "../config/r2.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =====================================================
   ✅ UPLOAD USER IMAGE
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
    console.error("USER UPLOAD ERROR:", err);
    throw new Error("User image upload failed");
  }
};

/* =====================================================
   ✅ DELETE USER IMAGE
===================================================== */

export const deleteUserImage = async (url) => {
  try {
    if (!url) return;

    // Works for both workers.dev and r2.dev URLs
    const { pathname } = new URL(url);

    const key = pathname.replace(/^\/+/, "");

    if (!key) return;

    console.log("Deleting R2 object:", key);

    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    console.log("Deleted successfully:", key);
  } catch (err) {
    console.error("USER DELETE ERROR:", err);
  }
};