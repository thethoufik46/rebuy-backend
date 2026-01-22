import crypto from "crypto";

const ALGO = "aes-256-cbc";
const KEY = process.env.SELLER_SECRET_KEY; // 32 chars
const IV_LEN = 16;

export const encryptSeller = (text) => {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, Buffer.from(KEY), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};

export const decryptSeller = (text) => {
  const [ivHex, enc] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, Buffer.from(KEY), iv);

  let dec = decipher.update(enc, "hex", "utf8");
  dec += decipher.final("utf8");

  return dec;
};
