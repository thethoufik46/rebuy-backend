// ======================= slider.js =======================

import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import r2 from "../../config/r2.js";

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

// ============================================================
// UPLOAD SLIDER IMAGE
// ============================================================

export const uploadSliderImage = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("File buffer missing");
  }

  let ext = "jpg";

  if (file.mimetype) {
    const parts = file.mimetype.split("/");
    if (parts[1]) {
      ext = parts[1].toLowerCase();

      if (ext === "jpeg") {
        ext = "jpg";
      }
    }
  }

  const key =
    `sliders/${Date.now()}-${Math.random()
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

// ============================================================
// DELETE SLIDER IMAGE
// ============================================================

export const deleteSliderImage = async (url) => {
  if (!url) return;

  const publicPrefix = `${PUBLIC_URL}/`;

  if (!url.startsWith(publicPrefix)) {
    return;
  }

  const key = url.replace(publicPrefix, "");

  if (!key) return;

  await r2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
};