import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
   ✅ CONSTANTS
==================================================*/
const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =================================================
   ✅ UPLOAD IMAGE TO R2 (PUBLIC)
==================================================*/
export const uploadCarImage = async (file, folder = "cars") => {
  try {
    const fileName = `${Date.now()}-${file.originalname}`;
    const key = `${folder}/${fileName}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    return `${PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error("❌ R2 Upload Error:", error);
    throw new Error("Image upload failed");
  }
};

/* =================================================
   ✅ DELETE IMAGE FROM R2
==================================================*/
export const deleteCarImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    const key = imageUrl.replace(`${PUBLIC_URL}/`, "");

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
