import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

/* =================================================
   ✅ CLOUDFARE R2 CLIENT
==================================================*/
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

/* =================================================
   ✅ CONSTANT
==================================================*/
const BUCKET = process.env.R2_BUCKET;

if (!BUCKET) {
  throw new Error("❌ R2_BUCKET missing in environment variables");
}

/* =================================================
   ✅ UPLOAD IMAGE → RETURN ONLY KEY
==================================================*/
export const uploadCarImage = async (file, folder = "cars") => {
  try {
    const ext = file.mimetype?.split("/")[1] || "jpg";
    const key = `${folder}/${Date.now()}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    // ✅ ONLY KEY
    return key;
  } catch (error) {
    console.error("❌ R2 Upload Error:", error);
    throw new Error("Image upload failed");
  }
};

/* =================================================
   ✅ DELETE IMAGE (KEY ONLY)
==================================================*/
export const deleteCarImage = async (key) => {
  try {
    if (!key) return;

    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  } catch (error) {
    console.error("❌ R2 Delete Error:", error);
  }
};
