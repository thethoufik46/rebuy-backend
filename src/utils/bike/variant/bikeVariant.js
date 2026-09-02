import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import r2 from "../../../config/r2.js";

// =====================================================
// UPLOAD BIKE VARIANT IMAGE
// =====================================================

export const uploadBikeVariantImage = async (file) => {
  if (!file) {
    throw new Error("Bike variant image file is required");
  }

  const extension =
    file.originalname?.split(".").pop()?.toLowerCase() || "jpg";

  const key = `bikevariants/${Date.now()}-${Math.random()
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

// =====================================================
// DELETE BIKE VARIANT IMAGE
// =====================================================

export const deleteBikeVariantImage = async (url) => {
  if (!url) return;

  try {
    const publicUrl =
      process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

    let key = url;

    // Convert full public URL → R2 object key
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
      "Bike variant image delete error:",
      error
    );
  }
};