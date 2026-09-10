// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import {PutObjectCommand,DeleteObjectCommand} from "@aws-sdk/client-s3";
import r2 from "../../../config/r2.js";
const BUCKET=process.env.R2_BUCKET;
const PUBLIC_URL=process.env.R2_PUBLIC_URL;
export const uploadPcBrandImage=async(file)=>{
  if(!file?.buffer)throw new Error("File buffer missing");
  const ext=file.originalname?.split(".").pop()||file.mimetype?.split("/")[1]||"jpg";
  const key=`pc_brands/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  await r2.send(new PutObjectCommand({Bucket:BUCKET,Key:key,Body:file.buffer,ContentType:file.mimetype}));
  return `${PUBLIC_URL}/${key}`;
};
export const deletePcBrandImage=async(url)=>{
  if(!url)return;
  const key=url.replace(`${PUBLIC_URL}/`,"");
  await r2.send(new DeleteObjectCommand({Bucket:BUCKET,Key:key}));
};