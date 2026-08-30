// ======================= src/utils/buyRequestAudio.js =======================

import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import r2 from "../config/r2.js";


// ============================================================
// ENV
// ============================================================

const BUCKET =
  process.env.R2_BUCKET;

const PUBLIC_URL =
  process.env.R2_PUBLIC_URL;


// ============================================================
// HELPERS
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
// ALLOWED AUDIO EXTENSIONS
// ============================================================

const ALLOWED_EXTENSIONS = [
  "m4a",
  "mp3",
  "wav",
  "aac",
  "ogg",
  "webm",
];


// ============================================================
// GET SAFE AUDIO EXTENSION
// ============================================================

const getAudioExtension = (
  file
) => {

  // ----------------------------------------------------------
  // First try original filename
  // ----------------------------------------------------------

  if (file?.originalname) {

    const originalName =
      String(
        file.originalname
      ).trim();


    const parts =
      originalName.split(".");


    if (parts.length > 1) {

      const ext =
        parts
          .pop()
          .toLowerCase()
          .replace(
            /[^a-z0-9]/g,
            ""
          );


      if (
        ALLOWED_EXTENSIONS.includes(
          ext
        )
      ) {
        return ext;
      }
    }
  }


  // ----------------------------------------------------------
  // Fallback based on MIME type
  // ----------------------------------------------------------

  const mime =
    String(
      file?.mimetype || ""
    ).toLowerCase();


  if (
    mime === "audio/mpeg" ||
    mime === "audio/mp3"
  ) {
    return "mp3";
  }


  if (
    mime === "audio/wav" ||
    mime === "audio/x-wav"
  ) {
    return "wav";
  }


  if (
    mime === "audio/aac"
  ) {
    return "aac";
  }


  if (
    mime === "audio/ogg"
  ) {
    return "ogg";
  }


  if (
    mime === "audio/webm"
  ) {
    return "webm";
  }


  // ----------------------------------------------------------
  // Flutter / iOS commonly sends
  // audio/mp4 for .m4a
  // ----------------------------------------------------------

  return "m4a";
};


// ============================================================
// VALIDATE R2 CONFIG
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
// 🟢 UPLOAD BUY REQUEST AUDIO
// ============================================================

export const uploadBuyRequestAudio = async (
  file,
  folder = "buyrequest/audio"
) => {

  try {

    // --------------------------------------------------------
    // Validate file
    // --------------------------------------------------------

    if (
      !file ||
      !file.buffer ||
      !Buffer.isBuffer(
        file.buffer
      )
    ) {

      throw new Error(
        "Invalid audio file"
      );
    }


    // --------------------------------------------------------
    // Validate R2
    // --------------------------------------------------------

    validateR2Config();


    // --------------------------------------------------------
    // Clean folder
    // --------------------------------------------------------

    const cleanFolder =
      String(
        folder ||
          "buyrequest/audio"
      )
        .replace(
          /^\/+/,
          ""
        )
        .replace(
          /\/+$/,
          ""
        );


    // --------------------------------------------------------
    // Extension
    // --------------------------------------------------------

    const ext =
      getAudioExtension(
        file
      );


    // --------------------------------------------------------
    // Unique filename
    // --------------------------------------------------------

    const fileName =
      `${Date.now()}-` +
      `${Math.random()
        .toString(36)
        .substring(2, 12)}` +
      `.${ext}`;


    // --------------------------------------------------------
    // R2 object key
    // --------------------------------------------------------

    const key =
      `${cleanFolder}/${fileName}`;


    // --------------------------------------------------------
    // Content Type
    // --------------------------------------------------------

    let contentType =
      file.mimetype ||
      "audio/mp4";


    // --------------------------------------------------------
    // Normalize common MIME types
    // --------------------------------------------------------

    if (
      ext === "m4a" &&
      (
        !contentType ||
        contentType ===
          "application/octet-stream"
      )
    ) {

      contentType =
        "audio/mp4";
    }


    if (
      ext === "mp3"
    ) {

      contentType =
        "audio/mpeg";
    }


    if (
      ext === "wav"
    ) {

      contentType =
        "audio/wav";
    }


    if (
      ext === "aac"
    ) {

      contentType =
        "audio/aac";
    }


    if (
      ext === "ogg"
    ) {

      contentType =
        "audio/ogg";
    }


    if (
      ext === "webm"
    ) {

      contentType =
        "audio/webm";
    }


    // --------------------------------------------------------
    // Upload to Cloudflare R2
    // --------------------------------------------------------

    await r2.send(
      new PutObjectCommand({

        Bucket:
          BUCKET,

        Key:
          key,

        Body:
          file.buffer,

        ContentType:
          contentType,
      })
    );


    // --------------------------------------------------------
    // Public URL
    // --------------------------------------------------------

    const publicBase =
      getPublicBase();


    const publicUrl =
      `${publicBase}/${key}`;


    console.log(
      "BUY REQUEST AUDIO UPLOADED 👉",
      publicUrl
    );


    return publicUrl;

  } catch (error) {

    console.error(
      "BUY REQUEST AUDIO UPLOAD ERROR 👉",
      error
    );


    throw new Error(
      error?.message ||
        "Buy Request audio upload failed"
    );
  }
};


// ============================================================
// 🔴 DELETE BUY REQUEST AUDIO FROM R2
// ============================================================

export const deleteBuyRequestAudio = async (
  url
) => {

  try {

    // --------------------------------------------------------
    // No URL = nothing to delete
    // --------------------------------------------------------

    if (!url) {
      return true;
    }


    // --------------------------------------------------------
    // Validate R2 bucket
    // --------------------------------------------------------

    if (!BUCKET) {

      console.error(
        "R2_BUCKET is missing"
      );

      return false;
    }


    // --------------------------------------------------------
    // Validate public URL
    // --------------------------------------------------------

    const publicBase =
      getPublicBase();


    if (!publicBase) {

      console.error(
        "R2_PUBLIC_URL is missing"
      );

      return false;
    }


    // --------------------------------------------------------
    // Clean URL
    // --------------------------------------------------------

    const audioUrl =
      String(
        url
      ).trim();


    if (!audioUrl) {
      return true;
    }


    // --------------------------------------------------------
    // Security:
    // Only delete files belonging
    // to our configured public URL
    // --------------------------------------------------------

    if (
      !audioUrl.startsWith(
        `${publicBase}/`
      )
    ) {

      console.warn(
        "BUY REQUEST AUDIO DELETE SKIPPED - external URL 👉",
        audioUrl
      );

      return false;
    }


    // --------------------------------------------------------
    // Extract R2 object key
    // --------------------------------------------------------

    const key =
      audioUrl.substring(
        `${publicBase}/`.length
      );


    if (!key) {
      return false;
    }


    // --------------------------------------------------------
    // Delete from R2
    // --------------------------------------------------------

    await r2.send(
      new DeleteObjectCommand({

        Bucket:
          BUCKET,

        Key:
          key,
      })
    );


    console.log(
      "BUY REQUEST AUDIO DELETED FROM R2 👉",
      key
    );


    return true;

  } catch (error) {

    // --------------------------------------------------------
    // Don't crash the whole request
    // if R2 delete fails
    // --------------------------------------------------------

    console.error(
      "BUY REQUEST AUDIO DELETE ERROR 👉",
      error
    );


    return false;
  }
};


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  uploadBuyRequestAudio,
  deleteBuyRequestAudio,
};