// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES.
// KEEP CODE LINES SHORT. KEEP CODE COMPACT. DO NOT ADD EMPTY LINES. BREAK LONG CODE INTO SHORT, READABLE LINES.
import {PutObjectCommand,DeleteObjectCommand} from "@aws-sdk/client-s3";
import r2 from "../../config/r2.js";
import {addWatermarkBuffer} from "../watermark.js";
const BUCKET=process.env.R2_BUCKET;
const PUBLIC_URL=process.env.R2_PUBLIC_URL;
export const uploadBikeImage=async(file,folder)=>{
  try{
    if(!file?.buffer) throw new Error("Invalid file upload");
    if(!BUCKET) throw new Error("R2_BUCKET is missing");
    if(!PUBLIC_URL) throw new Error("R2_PUBLIC_URL is missing");
    let bufferToUpload=file.buffer;
    let ext="jpg";
    let contentType=file.mimetype||"application/octet-stream";
    const isImage=contentType.startsWith("image/");
    const isGallery=folder.includes("gallery");
    const isBanner=folder.includes("banner");
    if(isGallery||isBanner){
      const maxKB=isBanner?100:80;
      bufferToUpload=await addWatermarkBuffer(file.buffer,maxKB);
      ext="jpg";
      contentType="image/jpeg";
    }else if(isImage){
      ext="jpg";
      contentType="image/jpeg";
    }else if(file.mimetype?.includes("/")){
      ext=file.mimetype.split("/")[1]||"bin";
    }
    const key=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await r2.send(new PutObjectCommand({
      Bucket:BUCKET,
      Key:key,
      Body:bufferToUpload,
      ContentType:contentType,
    }));
    console.log(
      `BIKE R2 UPLOAD: ${key} | `+
      `${(bufferToUpload.length/1024).toFixed(2)} KB | ${contentType}`
    );
    return `${PUBLIC_URL}/${key}`;
  }catch(err){
    console.error("BIKE UPLOAD ERROR:",err);
    console.error("BIKE UPLOAD MESSAGE:",err?.message);
    throw new Error(err?.message||"File upload failed");
  }
};
export const deleteBikeImage=async(url)=>{
  try{
    if(!url||!PUBLIC_URL||!url.startsWith(PUBLIC_URL)) return;
    const key=url.replace(`${PUBLIC_URL}/`,"");
    if(!key) return;
    await r2.send(new DeleteObjectCommand({
      Bucket:BUCKET,
      Key:key,
    }));
  }catch(err){
    console.error("BIKE DELETE ERROR:",err?.message);
  }
};