// ======================= bikeBrand.js =======================

import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import r2 from "../../../config/r2.js";

// ============================================================
// UPLOAD BIKE BRAND LOGO
// ============================================================

export const uploadBikeBrandLogo = async (file) => {
  if (!file) {
    throw new Error("Bike brand logo file is required");
  }

  const extension =
    file.originalname?.split(".").pop()?.toLowerCase() || "jpg";

  const key = `bikebrands/${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}.${extension}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  const publicUrl =
    `${process.env.R2_PUBLIC_URL}/${key}`;

  return publicUrl;
};

// ============================================================
// DELETE BIKE BRAND LOGO
// ============================================================

export const deleteBikeBrandLogo = async (url) => {
  if (!url) return;

  try {
    const publicUrl =
      process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

    let key = url;

    if (publicUrl && url.startsWith(publicUrl)) {
      key = url.substring(publicUrl.length + 1);
    }

    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    console.error(
      "Bike brand logo delete error:",
      error
    );
  }
};