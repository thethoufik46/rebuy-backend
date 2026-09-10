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
    const mime=file.mimetype||"image/jpeg";
    const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":mime==="image/gif"?"gif":"jpg";
    const key=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    let bufferToUpload=file.buffer;
    if(folder.includes("gallery")||folder.includes("banner"))bufferToUpload=await addWatermarkBuffer(file.buffer);
    await r2.send(new PutObjectCommand({Bucket:BUCKET,Key:key,Body:bufferToUpload,ContentType:mime}));
    return `${PUBLIC_URL}/${key}`;
  }catch(err){
    console.error("UPLOAD ERROR:",err.message);
    throw new Error("Electronics upload failed");
  }
};
export const deleteElectronicsMedia=async(url)=>{
  try{
    if(!url||!url.startsWith(PUBLIC_URL))return;
    const key=url.replace(`${PUBLIC_URL}/`,"");
    if(!key)return;
    await r2.send(new DeleteObjectCommand({Bucket:BUCKET,Key:key}));
  }catch(err){console.error("DELETE ERROR:",err.message);}
};