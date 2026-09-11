// 1. MUST FOLLOW RULES — PAGE 1. DO NOT REMOVE OR MODIFY THIS TOP COMMENT.
// ANY CODE CHANGE MUST KEEP IT AT THE TOP. KEEP CODE ULTRA-COMPACT. DO NOT ADD EMPTY LINES.
// REDUCE LINE COUNT AGGRESSIVELY: ~100 LINES → ~30 LINES WHEN SAFE. KEEP 100% LOGIC & FUNCTIONALITY.
import {PutObjectCommand,DeleteObjectCommand} from "@aws-sdk/client-s3";
import r2 from "../../config/r2.js";
import {addWatermarkBuffer} from "../watermark.js";
const BUCKET=process.env.R2_BUCKET;
const PUBLIC_URL=process.env.R2_PUBLIC_URL;
export const uploadElectronicsMedia=async(file,folder)=>{
  try{
    if(!file?.buffer)throw new Error("Invalid file upload");
    if(!BUCKET)throw new Error("R2_BUCKET is missing");
    if(!PUBLIC_URL)throw new Error("R2_PUBLIC_URL is missing");
    const mime=file.mimetype||"image/jpeg";
    const isGallery=folder.includes("gallery"),isBanner=folder.includes("banner");
    let bufferToUpload=file.buffer,ext=mime.split("/")[1]||"bin",contentType=mime;
    if(isGallery||isBanner){
      bufferToUpload=await addWatermarkBuffer(file.buffer,isBanner?100:80);
      ext="jpg";
      contentType="image/jpeg";
    }else if(mime.startsWith("image/")){
      ext="jpg";
      contentType="image/jpeg";
    }
    const key=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await r2.send(new PutObjectCommand({Bucket:BUCKET,Key:key,Body:bufferToUpload,ContentType:contentType}));
    console.log(`ELECTRONICS R2 UPLOAD: ${key} | ${(bufferToUpload.length/1024).toFixed(2)} KB | ${contentType}`);
    return `${PUBLIC_URL}/${key}`;
  }catch(err){
    console.error("ELECTRONICS UPLOAD ERROR:",err);
    console.error("ELECTRONICS UPLOAD MESSAGE:",err?.message);
    throw new Error(err?.message||"Electronics upload failed");
  }
};
export const deleteElectronicsMedia=async(url)=>{
  try{
    if(!url||!PUBLIC_URL||!url.startsWith(PUBLIC_URL))return;
    const key=url.replace(`${PUBLIC_URL}/`,"");
    if(!key)return;
    await r2.send(new DeleteObjectCommand({Bucket:BUCKET,Key:key}));
  }catch(err){console.error("ELECTRONICS DELETE ERROR:",err?.message);}
};