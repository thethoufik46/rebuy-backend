import sharp from "sharp";
import path from "path";

export const addWatermarkBuffer = async (imageBuffer) => {

  const logoPath = path.join(process.cwd(), "assets/logo.png");

  // get image size
  const metadata = await sharp(imageBuffer).metadata();

  const imageWidth = metadata.width || 1200;

  // logo width = 25% of image width
  const logoWidth = Math.round(imageWidth * 0.25);

  const logoBuffer = await sharp(logoPath)
    .resize(logoWidth)
    .png()
    .toBuffer();

  return await sharp(imageBuffer)
    .composite([
      {
        input: logoBuffer,
        gravity: "south",   // bottom center
      },
    ])
    .jpeg({ quality: 95 })
    .toBuffer();
};