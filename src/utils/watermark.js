import sharp from "sharp";
import path from "path";

export const addWatermarkBuffer = async (imageBuffer) => {
  const logoPath = path.join(process.cwd(), "assets/logo.png");

  const logoBuffer = await sharp(logoPath)
    .resize(170)
    .png()
    .toBuffer();

  return await sharp(imageBuffer)
    .composite([
      {
        input: logoBuffer,
        gravity: "south",
      },
    ])
    .jpeg({ quality: 95 })
    .toBuffer();
};