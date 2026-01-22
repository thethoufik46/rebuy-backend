import crypto from "crypto";

const ALGO = "aes-256-cbc";
const KEY = Buffer.from(process.env.SELLER_SECRET_KEY);
const IV_LEN = 16;

export const encryptSeller = (text) => {
  if (!text) return text;

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);

  let encrypted = cipher.update(String(text), "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};

export const decryptSeller = (text) => {
  if (!text || !text.includes(":")) return text;

  const [ivHex, enc] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);

  let decrypted = decipher.update(enc, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
