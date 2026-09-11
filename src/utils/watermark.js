import sharp from "sharp";
import path from "path";
export const addWatermarkBuffer=async(imageBuffer,maxKB=80)=>{
  const logoPath=path.join(process.cwd(),"assets/logo.png");
  const metadata=await sharp(imageBuffer).metadata();
  const width=metadata.width||1200;
  const logoWidth=Math.round(width*0.20);
  const logoBuffer=await sharp(logoPath).resize({width:logoWidth}).png().toBuffer();
  let quality=85;
  let result=await sharp(imageBuffer).composite([{input:logoBuffer,gravity:"south"}]).jpeg({quality,mozjpeg:true}).toBuffer();
  while(result.length>maxKB*1024&&quality>30){
    quality-=5;
    result=await sharp(imageBuffer).composite([{input:logoBuffer,gravity:"south"}]).jpeg({quality,mozjpeg:true}).toBuffer();
  }
  return result;
};