import { S3Client } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto", // 🔥 MUST
  endpoint: process.env.R2_ENDPOINT, // 🔥 MUST
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

export default r2;
