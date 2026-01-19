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
   ✅ CONSTANTS (🔥 SAME AS PROFILE IMAGE)
==================================================*/
const BUCKET = process.env.R2_BUCKET; // ✅ IMPORTANT
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =================================================
   ✅ SAFETY CHECK
==================================================*/
if (!BUCKET) {
  throw new Error("❌ R2_BUCKET missing in environment variables");
}

if (!PUBLIC_URL) {
  throw new Error("❌ R2_PUBLIC_URL missing in environment variables");
}

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

    // ✅ store full public URL in MongoDB
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

    // convert full URL → key
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
