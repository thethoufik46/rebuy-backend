import sharp from "sharp";
import path from "path";

export const addWatermarkBuffer = async (imageBuffer) => {
  const logoPath = path.join(process.cwd(), "assets/logo.png");

  const logoBuffer = await sharp(logoPath)
    .resize(170)              // 🔥 auto nice size
    .png()
    .toBuffer();

  return await sharp(imageBuffer)
    .composite([
      {
        input: logoBuffer,
        gravity: "south",      // ✅ bottom center (OLX style)
        blend: "over",
      },
    ])
    .jpeg({ quality: 100 })
    .toBuffer();
};
