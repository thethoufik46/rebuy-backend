import {PutObjectCommand,DeleteObjectCommand} from "@aws-sdk/client-s3";
import r2 from "../../config/r2.js";
import {addWatermarkBuffer} from "../watermark.js";
const BUCKET=process.env.R2_BUCKET;
const PUBLIC_URL=process.env.R2_PUBLIC_URL;
export const uploadCarImage=async(file,folder)=>{
  try{
    if(!file?.buffer) throw new Error("Invalid file upload");
    let bufferToUpload=file.buffer;
    let ext="bin";
    let contentType=file.mimetype||"application/octet-stream";
    if(folder.includes("gallery")||folder.includes("banner")){
      const maxKB=folder.includes("banner")?100:80;
      bufferToUpload=await addWatermarkBuffer(file.buffer,maxKB);
      ext="jpg";
      contentType="image/jpeg";
    }else if(contentType.startsWith("image/")){
      ext="jpg";
      contentType="image/jpeg";
      bufferToUpload=await sharp(file.buffer).jpeg({quality:85,mozjpeg:true}).toBuffer();
    }else if(file.mimetype?.includes("/")){
      ext=file.mimetype.split("/")[1]||"bin";
    }
    const key=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await r2.send(new PutObjectCommand({Bucket:BUCKET,Key:key,Body:bufferToUpload,ContentType:contentType}));
    console.log(`CAR R2 UPLOAD: ${key} | ${(bufferToUpload.length/1024).toFixed(2)} KB | ${contentType}`);
    return `${PUBLIC_URL}/${key}`;
  }catch(err){
    console.error("UPLOAD ERROR:",err.message);
    throw new Error("File upload failed");
  }
};
export const deleteCarImage=async(url)=>{
  try{
    if(!url||!url.startsWith(PUBLIC_URL)) return;
    const key=url.replace(`${PUBLIC_URL}/`,"");
    if(!key)return;
    await r2.send(new DeleteObjectCommand({Bucket:BUCKET,Key:key}));
  }catch(err){console.error("DELETE ERROR:",err.message);}
};