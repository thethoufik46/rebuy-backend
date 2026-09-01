// ============================================================
// oldSpareImage.js
// OLD SPARE IMAGE R2 UPLOAD / DELETE
// ============================================================

import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import r2 from "../config/r2.js";

// ============================================================
// ENV
// ============================================================

const BUCKET = process.env.R2_BUCKET;

const PUBLIC_URL = process.env.R2_PUBLIC_URL;

// ============================================================
// PUBLIC BASE
// ============================================================

const getPublicBase = () => {
  return String(
    PUBLIC_URL || ""
  ).replace(
    /\/+$/,
    ""
  );
};

// ============================================================
// EXTENSION
// ============================================================

const getImageExtension = (file) => {
  const mime = String(
    file?.mimetype || ""
  ).toLowerCase();

  if (mime === "image/jpeg") {
    return "jpg";
  }

  if (mime === "image/jpg") {
    return "jpg";
  }

  if (mime === "image/png") {
    return "png";
  }

  if (mime === "image/webp") {
    return "webp";
  }

  return "jpg";
};

// ============================================================
// VALIDATE R2
// ============================================================

const validateR2Config = () => {
  if (!BUCKET) {
    throw new Error(
      "R2_BUCKET is missing"
    );
  }

  if (!PUBLIC_URL) {
    throw new Error(
      "R2_PUBLIC_URL is missing"
    );
  }
};

// ============================================================
// UPLOAD
// ============================================================

export const uploadOldSpareImage = async (
  file,
  folder = "oldspare/images"
) => {
  try {
    if (
      !file ||
      !file.buffer ||
      !Buffer.isBuffer(file.buffer)
    ) {
      throw new Error(
        "Invalid old spare image"
      );
    }

    validateR2Config();

    const cleanFolder = String(
      folder || "oldspare/images"
    )
      .replace(
        /^\/+/,
        ""
      )
      .replace(
        /\/+$/,
        ""
      );

    const ext =
      getImageExtension(file);

    const fileName =
      `${Date.now()}-` +
      `${Math.random()
        .toString(36)
        .substring(2, 12)}` +
      `.${ext}`;

    const key =
      `${cleanFolder}/${fileName}`;

    let contentType =
      file.mimetype ||
      "image/jpeg";

    if (ext === "jpg") {
      contentType = "image/jpeg";
    }

    if (ext === "png") {
      contentType = "image/png";
    }

    if (ext === "webp") {
      contentType = "image/webp";
    }

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
      })
    );

    const publicBase =
      getPublicBase();

    const publicUrl =
      `${publicBase}/${key}`;

    console.log(
      "OLD SPARE IMAGE UPLOADED 👉",
      publicUrl
    );

    return publicUrl;
  } catch (error) {
    console.error(
      "OLD SPARE IMAGE UPLOAD ERROR 👉",
      error
    );

    throw new Error(
      error?.message ||
        "Old spare image upload failed"
    );
  }
};

// ============================================================
// DELETE
// ============================================================

export const deleteOldSpareImage = async (
  url
) => {
  try {
    if (!url) {
      return true;
    }

    if (!BUCKET) {
      console.error(
        "R2_BUCKET is missing"
      );

      return false;
    }

    const publicBase =
      getPublicBase();

    if (!publicBase) {
      console.error(
        "R2_PUBLIC_URL is missing"
      );

      return false;
    }

    const imageUrl =
      String(url).trim();

    if (!imageUrl) {
      return true;
    }

    // ----------------------------------------------------------
    // SECURITY
    // ----------------------------------------------------------

    if (
      !imageUrl.startsWith(
        `${publicBase}/`
      )
    ) {
      console.warn(
        "OLD SPARE IMAGE DELETE SKIPPED - external URL 👉",
        imageUrl
      );

      return false;
    }

    const key =
      imageUrl.substring(
        `${publicBase}/`.length
      );

    if (!key) {
      return false;
    }

    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    console.log(
      "OLD SPARE IMAGE DELETED 👉",
      key
    );

    return true;
  } catch (error) {
    console.error(
      "OLD SPARE IMAGE DELETE ERROR 👉",
      error
    );

    return false;
  }
};

export default {
  uploadOldSpareImage,
  deleteOldSpareImage,
};